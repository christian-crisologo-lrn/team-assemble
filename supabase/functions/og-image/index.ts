import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const sprintIdParam = url.searchParams.get('sprint')
    const teamIdParam = url.searchParams.get('team')
    const shareMode = url.searchParams.get('share') === '1'
    const replayUrlParam = url.searchParams.get('replay')
    const appBaseParam = url.searchParams.get('app')

    if (!sprintIdParam && !teamIdParam) {
      return new Response('Missing sprint or team parameter', {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      })
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let sprint: any | null = null

    if (sprintIdParam) {
      const { data: sprintById, error: sprintError } = await supabase
        .from('lrn_sprints')
        .select('*')
        .eq('id', sprintIdParam)
        .single()

      if (sprintError || !sprintById) {
        return new Response('Sprint not found', {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        })
      }

      sprint = sprintById
    } else {
      const { data: activeSprints, error: activeSprintError } = await supabase
        .from('lrn_sprints')
        .select('*')
        .eq('team_id', teamIdParam)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1)

      if (activeSprintError) {
        return new Response('Could not resolve current sprint for team', {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        })
      }

      sprint = activeSprints?.[0] ?? null

      if (!sprint) {
        return new Response('No active sprint found for team', {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        })
      }
    }

    const sprintId = String(sprint.id)

    // Fetch team, roles, and members
    const [teamRes, rolesRes, membersRes] = await Promise.all([
      supabase.from('lrn_teams').select('*').eq('id', sprint.team_id).single(),
      supabase.from('lrn_roles').select('*').eq('team_id', sprint.team_id).order('created_at', { ascending: true }),
      supabase.from('lrn_team_members').select('member_id, lrn_members(*)').eq('team_id', sprint.team_id)
    ])

    const team = teamRes.data
    const roles = rolesRes.data || []
    const members = membersRes.data?.map((tm: any) => tm.lrn_members).filter(Boolean) || []

    if (!team) {
      return new Response('Team not found', {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      })
    }

    if (shareMode) {
      const replayUrl = resolveReplayUrl({
        replayUrlParam,
        appBaseParam,
        sprintId,
      })

      const shareHtml = generateShareCardHTML({
        team,
        roles,
        members,
        assignments: sprint.assignments,
        sprintId,
        requestUrl: url,
        replayUrl,
      })

      return new Response(shareHtml, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=120',
        },
      })
    }

    const svg = generateOGImageSVG(team, roles, members, sprint.assignments)

    try {
      const png = await svgToPng(svg)
      return new Response(png, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=300',
        },
      })
    } catch (_error) {
      return new Response(svg, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=120',
        },
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function truncate(value: string, max = 18): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

async function svgToPng(svg: string): Promise<Uint8Array> {
  const { Resvg } = await import('npm:@resvg/resvg-js@2.6.2')
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: 1200,
    },
  })

  const image = resvg.render()
  return image.asPng()
}

function generateOGImageSVG(team: any, roles: any[], members: any[], assignments: Record<string, string>) {
  const width = 1200
  const height = 630
  const maxCards = 8
  const cards = roles.slice(0, maxCards)

  const columns = 4
  const cardWidth = 250
  const cardHeight = 170
  const gapX = 20
  const gapY = 18
  const startX = 65
  const startY = 170

  const cardNodes = cards.map((role, index) => {
    const row = Math.floor(index / columns)
    const col = index % columns
    const x = startX + col * (cardWidth + gapX)
    const y = startY + row * (cardHeight + gapY)
    const member = members.find((m: any) => m.id === assignments[role.id])
    const memberName = member?.name ? truncate(String(member.name), 20) : 'Unassigned'
    const roleName = truncate(String(role.name || 'Role'), 18)
    const initial = member?.name ? String(member.name).charAt(0).toUpperCase() : '?'

    return `
      <g>
        <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="16" fill="rgba(15,23,42,0.55)" stroke="rgba(196,181,253,0.4)" />
        <circle cx="${x + 44}" cy="${y + 48}" r="22" fill="rgba(168,85,247,0.25)" stroke="rgba(216,180,254,0.7)" />
        <text x="${x + 44}" y="${y + 55}" font-size="20" text-anchor="middle" fill="#f5f3ff" font-weight="700">${escapeXml(initial)}</text>
        <text x="${x + 78}" y="${y + 42}" font-size="14" fill="#e9d5ff" font-weight="700">${escapeXml(roleName)}</text>
        <text x="${x + 78}" y="${y + 68}" font-size="18" fill="#ffffff" font-weight="600">${escapeXml(memberName)}</text>
      </g>
    `
  }).join('')

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Sprint role assignments">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="55%" stop-color="#4c1d95"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
  </defs>

  <rect width="100%" height="100%" fill="url(#bg)" />
  <circle cx="110" cy="85" r="140" fill="rgba(168,85,247,0.18)" />
  <circle cx="1090" cy="560" r="170" fill="rgba(236,72,153,0.14)" />

  <text x="60" y="82" font-size="48" fill="#ffffff" font-weight="800">Team ${escapeXml(truncate(String(team.name || 'Unknown Team'), 26))}</text>
  <text x="60" y="118" font-size="24" fill="#ddd6fe">Current Sprint Roles</text>

  ${cardNodes}

  <text x="60" y="595" font-size="16" fill="#ddd6fe">team-assemble</text>
</svg>
  `.trim()
}

function assignmentSummary(roles: any[], members: any[], assignments: Record<string, string>): string {
  return roles.slice(0, 4).map((role) => {
    const member = members.find((m: any) => m.id === assignments[role.id])
    const roleName = truncate(String(role.name || 'Role'), 16)
    const memberName = member?.name ? truncate(String(member.name), 16) : 'Unassigned'
    return `${roleName}: ${memberName}`
  }).join(' • ')
}

function normalizeAppBase(appBase: string): string {
  return appBase.endsWith('/') ? appBase.slice(0, -1) : appBase
}

function resolveReplayUrl(input: {
  replayUrlParam: string | null
  appBaseParam: string | null
  sprintId: string
}): string | null {
  if (input.replayUrlParam) return input.replayUrlParam
  if (!input.appBaseParam) return null

  const base = normalizeAppBase(input.appBaseParam)
  return `${base}/presentation?replay=${encodeURIComponent(input.sprintId)}`
}

function generateShareCardHTML(input: {
  team: any
  roles: any[]
  members: any[]
  assignments: Record<string, string>
  sprintId: string
  requestUrl: URL
  replayUrl: string | null
}): string {
  const imageUrl = new URL(input.requestUrl.toString())
  imageUrl.search = ''
  imageUrl.searchParams.set('sprint', input.sprintId)
  imageUrl.searchParams.set('format', 'png')

  const teamName = truncate(String(input.team?.name || 'Team Assemble'), 28)
  const title = `Team ${teamName} - Sprint Roles`
  const summary = assignmentSummary(input.roles, input.members, input.assignments)
  const description = summary || 'Current sprint role assignments'
  const replayUrl = input.replayUrl ? escapeXml(input.replayUrl) : ''
  const redirectTag = replayUrl ? `<meta http-equiv="refresh" content="0;url=${replayUrl}">` : ''
  const redirectScript = replayUrl
    ? `<script>window.location.replace(${JSON.stringify(input.replayUrl)});</script>`
    : ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeXml(title)}</title>
    <meta name="description" content="${escapeXml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeXml(title)}" />
    <meta property="og:description" content="${escapeXml(description)}" />
    <meta property="og:image" content="${escapeXml(imageUrl.toString())}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeXml(title)}" />
    <meta name="twitter:description" content="${escapeXml(description)}" />
    <meta name="twitter:image" content="${escapeXml(imageUrl.toString())}" />
    ${redirectTag}
  </head>
  <body>
    <p>Opening presentation...</p>
    ${redirectScript}
  </body>
</html>`
}
