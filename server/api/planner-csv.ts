import { format } from 'date-fns';
import { getSupabaseAdmin, type SprintRecord } from './_shared';

export const config = {
  runtime: 'edge',
};

type PlannerStatus = 'planning' | 'active' | 'completed';
const STATUS_OPTIONS: PlannerStatus[] = ['planning', 'active', 'completed'];

function parseFilter(url: URL): { fromDate: Date | null; toDate: Date | null; statuses: Set<PlannerStatus> } {
  const raw = url.searchParams.get('filter');
  const filter = raw ? raw.replace(/^"|"$/g, '') : '';

  let fromDate: Date | null = null;
  let toDate: Date | null = null;
  const statuses = new Set<PlannerStatus>();

  if (!filter) return { fromDate, toDate, statuses };

  const parts = filter.split(',').map((part) => part.trim()).filter(Boolean);
  for (const part of parts) {
    const [keyRaw, ...rest] = part.split('=');
    const key = keyRaw?.trim();
    const value = rest.join('=').trim();
    if (!key || !value) continue;

    if (key === 'start_date') {
      fromDate = new Date(`${value}T00:00:00`);
    } else if (key === 'end_date') {
      toDate = new Date(`${value}T23:59:59.999`);
    } else if (key === 'status') {
      value.split('|').forEach((status) => {
        if (STATUS_OPTIONS.includes(status as PlannerStatus)) {
          statuses.add(status as PlannerStatus);
        }
      });
    }
  }

  return { fromDate, toDate, statuses };
}

function escapeCsv(value: string): string {
  const normalized = value ?? '';
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function filterSprints(sprints: SprintRecord[], fromDate: Date | null, toDate: Date | null, statuses: Set<PlannerStatus>) {
  return sprints.filter((sprint) => {
    if (statuses.size > 0 && !statuses.has(sprint.status as PlannerStatus)) {
      return false;
    }

    const sprintStart = new Date(sprint.start_date);
    const sprintEnd = new Date(sprint.end_date);

    if (fromDate && sprintEnd < fromDate) return false;
    if (toDate && sprintStart > toDate) return false;

    return true;
  });
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const teamId = url.searchParams.get('team');
    if (!teamId) {
      return new Response('Missing team parameter', { status: 400 });
    }

    const { fromDate, toDate, statuses } = parseFilter(url);
    const supabase = getSupabaseAdmin();

    const [sprintsRes, rolesRes, membersRes] = await Promise.all([
      supabase.from('lrn_sprints').select('*').eq('team_id', teamId).order('start_date', { ascending: true }),
      supabase.from('lrn_roles').select('id, name').eq('team_id', teamId).order('created_at', { ascending: true }),
      supabase.from('lrn_team_members').select('member_id, lrn_members(id, name)').eq('team_id', teamId),
    ]);

    if (sprintsRes.error) {
      return new Response(`Could not load sprints: ${sprintsRes.error.message}`, { status: 500 });
    }

    const sprints = (sprintsRes.data || []) as SprintRecord[];
    const filtered = filterSprints(sprints, fromDate, toDate, statuses);

    const roles = (rolesRes.data || []) as Array<{ id: string; name: string }>;
    const members = ((membersRes.data || []) as Array<{ lrn_members: { id: string; name: string } | null }>)
      .map((entry) => entry.lrn_members)
      .filter(Boolean) as Array<{ id: string; name: string }>;

    const headers = ['Sprint Name', 'Start Date', 'End Date', 'Status', 'Assignments'];
    const rows = filtered.map((sprint) => {
      const assignments = roles.map((role) => {
        const memberId = sprint.assignments[role.id];
        const member = members.find((m) => m.id === memberId);
        return `${role.name}: ${member?.name || 'Unassigned'}`;
      }).join(' | ');

      return [
        sprint.name,
        format(new Date(sprint.start_date), 'yyyy-MM-dd'),
        format(new Date(sprint.end_date), 'yyyy-MM-dd'),
        sprint.status,
        assignments,
      ].map(escapeCsv).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    return new Response(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="sprint-planner-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv"`,
        'cache-control': 'no-store',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
}
