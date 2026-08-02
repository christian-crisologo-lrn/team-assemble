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
    const sprintId = url.searchParams.get('sprint')

    if (!sprintId) {
      return new Response('Missing sprint parameter', {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      })
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch sprint data
    const { data: sprint, error: sprintError } = await supabase
      .from('lrn_sprints')
      .select('*')
      .eq('id', sprintId)
      .single()

    if (sprintError || !sprint) {
      return new Response('Sprint not found', {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      })
    }

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

    // Generate HTML for OG image
    const html = generateOGImageHTML(team, roles, members, sprint.assignments)

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function generateOGImageHTML(team: any, roles: any[], members: any[], assignments: Record<string, string>) {
  const roleCards = roles.slice(0, 8).map(role => {
    const member = members.find(m => m.id === assignments[role.id])
    
    return `
      <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 12px; padding: 16px; border: 1px solid rgba(255,255,255,0.2); display: flex; flex-direction: column; align-items: center; gap: 12px;">
        <div style="background: rgba(168, 85, 247, 0.2); padding: 12px; border-radius: 50%; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center;">
          <div style="color: #c4b5fd; font-size: 28px;">⚡</div>
        </div>
        <div style="color: #ddd6fe; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; text-align: center;">
          ${role.name}
        </div>
        ${member ? `
          <div style="width: 64px; height: 64px; border-radius: 50%; overflow: hidden; background: #334155; border: 2px solid #a855f7;">
            ${member.avatar_url ? 
              `<img src="${member.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;" />` :
              `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">${member.name.charAt(0).toUpperCase()}</div>`
            }
          </div>
          <div style="color: white; font-size: 14px; font-weight: 600; text-align: center; max-width: 100%; overflow: hidden; text-overflow: ellipsis;">
            ${member.name}
          </div>
        ` : `
          <div style="color: #94a3b8; font-size: 14px; font-style: italic;">Unassigned</div>
        `}
      </div>
    `
  }).join('')

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=1200, height=630">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          }
        </style>
      </head>
      <body>
        <div style="width: 1200px; height: 630px; background: linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px; position: relative; overflow: hidden;">
          <!-- Background decoration -->
          <div style="position: absolute; inset: 0; opacity: 0.1;">
            <div style="position: absolute; top: 40px; left: 40px; width: 160px; height: 160px; background: #a855f7; border-radius: 50%; filter: blur(60px);"></div>
            <div style="position: absolute; bottom: 40px; right: 40px; width: 240px; height: 240px; background: #ec4899; border-radius: 50%; filter: blur(60px);"></div>
          </div>

          <!-- Content -->
          <div style="position: relative; z-index: 10; width: 100%; max-width: 1100px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 48px; font-weight: 800; color: white; margin-bottom: 8px;">
                Team ${team.name}
              </h1>
              <p style="color: #ddd6fe; font-size: 24px;">Sprint Roles</p>
            </div>

            <!-- Roles Grid -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;">
              ${roleCards}
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 32px;">
              <div style="color: #ddd6fe; font-size: 18px;">team-assemble</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}
