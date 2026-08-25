import { ImageResponse } from '@vercel/og';
import { resolveContext } from './_shared';

export const config = {
  runtime: 'edge',
};

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const teamId = url.searchParams.get('team');
    const sprintId = url.searchParams.get('sprint');

    const { sprint, team, roles, members } = await resolveContext({ teamId, sprintId });

    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(135deg, #0f172a 0%, #4c1d95 55%, #1e1b4b 100%)',
            color: 'white',
            padding: 48,
            fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 24 }}>
            <div style={{ fontSize: 52, fontWeight: 800 }}>Team {truncate(team.name, 24)}</div>
            <div style={{ fontSize: 24, color: '#ddd6fe', marginTop: 8 }}>Current Sprint Roles</div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {roles.slice(0, 8).map((role) => {
              const memberId = sprint.assignments[role.id];
              const member = members.find((m) => m.id === memberId);
              const initial = member?.name ? member.name.charAt(0).toUpperCase() : '?';

              return (
                <div
                  key={role.id}
                  style={{
                    width: 260,
                    height: 170,
                    borderRadius: 16,
                    background: 'rgba(15,23,42,0.58)',
                    border: '1px solid rgba(196,181,253,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: 18,
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: 'rgba(168,85,247,0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                      }}
                    >
                      {initial}
                    </div>
                    <div style={{ fontSize: 18, color: '#e9d5ff', fontWeight: 700 }}>{truncate(role.name, 18)}</div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{truncate(member?.name || 'Unassigned', 18)}</div>
                </div>
              );
            })}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: message.includes('not found') || message.includes('No active sprint') ? 404 : 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
}
