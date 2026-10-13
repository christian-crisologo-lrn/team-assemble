import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, type SprintRecord } from './_shared.js';

const ALLOWED_STATUSES = new Set(['planning', 'active', 'completed']);

type ParsedFilters = {
  startDate?: string;
  endDate?: string;
  statuses?: string[];
};

function parseFilters(raw: string | null): ParsedFilters {
  const filters: ParsedFilters = {};
  if (!raw) {
    return filters;
  }

  for (const pair of raw.split(',')) {
    const trimmed = pair.trim();
    if (!trimmed) {
      continue;
    }

    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!value) {
      continue;
    }

    if (key === 'start_date') {
      filters.startDate = value;
    } else if (key === 'end_date') {
      filters.endDate = value;
    } else if (key === 'status') {
      const statuses = value
        .split('|')
        .map((status) => status.trim().toLowerCase())
        .filter((status) => ALLOWED_STATUSES.has(status));
      if (statuses.length > 0) {
        filters.statuses = statuses;
      }
    }
  }

  return filters;
}

function escapeCsv(value: unknown): string {
  const str = value == null ? '' : String(value);
  return `"${str.replaceAll('"', '""')}"`;
}

const CSV_COLUMNS: Array<'name' | 'start_date' | 'end_date' | 'status' | 'assignments' | 'id' | 'team_id'> = ['name', 'start_date', 'end_date', 'status', 'assignments', 'id', 'team_id'];

function describeAssignments(row: SprintRecord, roles: Array<{ id: string; name: string }>, memberById: Map<string, { id: string; name: string }>): string {
  const assignments = row.assignments || {};
  return roles
    .map((role) => {
      const memberId = assignments[role.id];
      const member = memberId ? memberById.get(memberId) : null;
      return `${role.name}: ${member?.name || 'Unassigned'}`;
    })
    .join(' | ');
}

function toCsv(rows: SprintRecord[], roles: Array<{ id: string; name: string }>, memberById: Map<string, { id: string; name: string }>): string {
  const header = CSV_COLUMNS.join(',');
  const lines = rows.map((row) => {
    const values: Record<typeof CSV_COLUMNS[number], string> = {
      name: row.name,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
      assignments: describeAssignments(row, roles, memberById),
      id: row.id,
      team_id: row.team_id,
    };

    return CSV_COLUMNS.map((column) => escapeCsv(values[column])).join(',');
  });
  return [header, ...lines].join('\r\n');
}

function parseFormat(raw: string | null): 'json' | 'csv' {
  const value = raw?.trim().toLowerCase();
  return value === 'csv' ? 'csv' : 'json';
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const teamId = url.searchParams.get('team');
    const format = parseFormat(url.searchParams.get('format') ?? url.searchParams.get('output'));

    if (!teamId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Missing team parameter');
      return;
    }

    const filters = parseFilters(url.searchParams.get('filter'));
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('lrn_sprints')
      .select('id, team_id, name, start_date, end_date, status, assignments')
      .eq('team_id', teamId)
      .order('start_date', { ascending: true });

    if (filters.startDate) {
      query = query.gte('start_date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('end_date', filters.endDate);
    }
    if (filters.statuses && filters.statuses.length > 0) {
      query = query.in('status', filters.statuses);
    }

    const [sprintsRes, rolesRes, membersRes] = await Promise.all([
      query,
      supabase.from('lrn_roles').select('id, name, color').eq('team_id', teamId).order('created_at', { ascending: true }),
      supabase.from('lrn_team_members').select('member_id, lrn_members(id, name, avatar_url)').eq('team_id', teamId),
    ]);

    const { data, error } = sprintsRes;
    if (error) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Could not load planner records');
      return;
    }

    const rows = (data || []) as SprintRecord[];
    const roles = (rolesRes.data || []) as Array<{ id: string; name: string; color?: string }>;
    const members = ((membersRes.data || []) as Array<{
      lrn_members?: { id: string; name: string; avatar_url?: string } | { id: string; name: string; avatar_url?: string }[] | null;
    }>)
      .flatMap((entry) => (Array.isArray(entry.lrn_members) ? entry.lrn_members : entry.lrn_members ? [entry.lrn_members] : []));

    const roleById = new Map(roles.map((role) => [role.id, role]));
    const memberById = new Map(members.map((member) => [member.id, member]));

    if (format === 'csv') {
      const csv = toCsv(rows, roles, memberById);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="planner-export.csv"');
      res.end(csv);
      return;
    }

    const jsonRows = rows.map((row) => {
      const assignments = row.assignments || {};
      const roleAssignments = Object.entries(assignments)
        .map(([roleId, memberId]) => {
          const role = roleById.get(roleId);
          const member = memberId ? memberById.get(memberId) : null;

          return {
            role_id: roleId,
            role_name: role?.name ?? null,
            member_id: memberId ?? null,
            member_name: member?.name ?? null,
            color: role?.color ?? null,
          };
        })
        .filter((item) => item.role_name || item.member_name);

      return {
        ...row,
        roles: roles.map((role) => ({
          id: role.id,
          name: role.name,
          color: role.color ?? null,
          member_id: assignments[role.id] ?? null,
          member_name: assignments[role.id] ? memberById.get(assignments[role.id])?.name ?? null : null,
        })),
        members: members.map((member) => ({
          id: member.id,
          name: member.name,
          avatar_url: member.avatar_url ?? null,
        })),
        role_assignments: roleAssignments,
      };
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(jsonRows));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    res.statusCode = message.toLowerCase().includes('missing') ? 400 : 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(message);
  }
}
