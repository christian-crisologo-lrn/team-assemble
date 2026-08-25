import { buildOrigin, escapeHtml, getAppBase, resolveContext } from './_shared';

export const config = {
  runtime: 'edge',
};

function summarizeRoles(roles: Array<{ id: string; name: string }>, members: Array<{ id: string; name: string }>, assignments: Record<string, string>): string {
  return roles
    .slice(0, 4)
    .map((role) => {
      const memberId = assignments[role.id];
      const member = members.find((m) => m.id === memberId);
      return `${role.name}: ${member?.name || 'Unassigned'}`;
    })
    .join(' | ');
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const teamId = url.searchParams.get('team');
    const sprintId = url.searchParams.get('sprint');

    const { sprint, team, roles, members } = await resolveContext({ teamId, sprintId });

    const appBase = getAppBase(url);
    const replayUrl = `${appBase}/presentation?replay=${encodeURIComponent(sprint.id)}`;

    const origin = buildOrigin(url);
    const ogUrl = new URL('/og', origin);
    ogUrl.searchParams.set('team', team.id);
    ogUrl.searchParams.set('sprint', sprint.id);
    ogUrl.searchParams.set('v', url.searchParams.get('v') || sprint.id);

    const title = `Team ${team.name} - Current Sprint Roles`;
    const description = summarizeRoles(roles, members, sprint.assignments) || 'Current sprint role assignments';

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />

    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(ogUrl.toString())}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(ogUrl.toString())}" />

    <meta http-equiv="refresh" content="0;url=${escapeHtml(replayUrl)}" />
  </head>
  <body>
    <p>Opening presentation...</p>
    <script>window.location.replace(${JSON.stringify(replayUrl)});</script>
  </body>
</html>`;

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=120',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: message.includes('not found') || message.includes('No active sprint') ? 404 : 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
}
