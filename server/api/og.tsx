import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ImageResponse } from '@vercel/og';
import { resolveContext, type ResolvedContext } from './_shared.js';

function statusFromError(message: string): number {
  const lower = message.toLowerCase();
  if (lower.includes('not found') || lower.includes('no active sprint')) {
    return 404;
  }
  if (lower.includes('missing')) {
    return 400;
  }
  return 500;
}

function buildPairs(context: ResolvedContext): Array<{ role: string; member: string; color?: string }> {
  const { roles, members, sprint } = context;
  const memberById = new Map(members.map((member) => [member.id, member.name]));
  const assignments = sprint.assignments || {};

  return roles.map((role) => {
    const memberId = assignments[role.id];
    const memberName = (memberId && memberById.get(memberId)) || 'Unassigned';
    return { role: role.name, member: memberName, color: role.color };
  });
}

function renderCard(context: ResolvedContext) {
  const pairs = buildPairs(context);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: '60px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#f8fafc',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '32px' }}>
        <div style={{ fontSize: 32, color: '#94a3b8', marginBottom: '8px' }}>{context.team.name}</div>
        <div style={{ fontSize: 56, fontWeight: 700 }}>{context.sprint.name}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {pairs.slice(0, 8).map((pair, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', fontSize: 30 }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '8px',
                marginRight: '18px',
                background: pair.color || '#38bdf8',
              }}
            />
            <div style={{ display: 'flex', color: '#cbd5e1', width: '340px' }}>{pair.role}</div>
            <div style={{ display: 'flex', fontWeight: 600 }}>{pair.member}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const teamId = url.searchParams.get('team');
    const sprintId = url.searchParams.get('sprint');

    const context = await resolveContext({ teamId, sprintId });

    const image = new ImageResponse(renderCard(context), {
      width: 1200,
      height: 630,
    });

    const arrayBuffer = await image.arrayBuffer();

    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.end(Buffer.from(arrayBuffer));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    res.statusCode = statusFromError(message);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(message);
  }
}
