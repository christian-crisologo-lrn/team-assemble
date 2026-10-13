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

const TAILWIND_COLOR_MAP: Record<string, string> = {
  'bg-red-500': '#ef4444',
  'bg-red-600': '#dc2626',
  'bg-blue-500': '#3b82f6',
  'bg-blue-600': '#2563eb',
  'bg-green-500': '#22c55e',
  'bg-green-600': '#16a34a',
  'bg-yellow-500': '#eab308',
  'bg-yellow-600': '#ca8a04',
  'bg-purple-500': '#a855f7',
  'bg-purple-600': '#9333ea',
  'bg-pink-500': '#ec4899',
  'bg-pink-600': '#db2777',
  'bg-indigo-500': '#6366f1',
  'bg-indigo-600': '#4f46e5',
  'bg-slate-500': '#64748b',
  'bg-slate-600': '#475569',
  'bg-cyan-500': '#06b6d4',
  'bg-teal-500': '#14b8a6',
  'bg-orange-500': '#f97316',
  'bg-rose-500': '#f43f5e',
  'bg-amber-500': '#f59e0b',
  'bg-emerald-500': '#10b981',
};

function normalizeRoleColor(color?: string): string {
  const value = (color || '').trim();
  if (!value) {
    return '#38bdf8';
  }

  if (value.startsWith('#')) {
    return value;
  }

  return TAILWIND_COLOR_MAP[value] || '#38bdf8';
}

function buildPairs(context: ResolvedContext): Array<{ role: string; member: string; color?: string }> {
  const { roles, members, sprint } = context;
  const memberById = new Map(members.map((member) => [member.id, member.name]));
  const assignments = sprint.assignments || {};

  return roles.map((role) => {
    const memberId = assignments[role.id];
    const memberName = (memberId && memberById.get(memberId)) || 'Unassigned';
    return { role: role.name, member: memberName, color: normalizeRoleColor(role.color) };
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
                background: normalizeRoleColor(pair.color),
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
