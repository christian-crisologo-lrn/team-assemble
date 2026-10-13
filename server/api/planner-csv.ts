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

const CSV_COLUMNS: Array<keyof SprintRecord> = ['name', 'start_date', 'end_date', 'status', 'id', 'team_id'];

function toCsv(rows: SprintRecord[]): string {
  const header = CSV_COLUMNS.join(',');
  const lines = rows.map((row) => CSV_COLUMNS.map((column) => escapeCsv(row[column])).join(','));
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
      .select('id, team_id, name, start_date, end_date, status')
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

    const { data, error } = await query;
    if (error) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Could not load planner records');
      return;
    }

    const rows = (data || []) as SprintRecord[];

    if (format === 'csv') {
      const csv = toCsv(rows);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="planner-export.csv"');
      res.end(csv);
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(rows));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    res.statusCode = message.toLowerCase().includes('missing') ? 400 : 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(message);
  }
}
