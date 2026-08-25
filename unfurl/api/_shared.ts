import { createClient } from '@supabase/supabase-js';

type Sprint = {
  id: string;
  team_id: string;
  assignments: Record<string, string>;
  start_date: string;
  status: string;
};

type Team = {
  id: string;
  name: string;
};

type Role = {
  id: string;
  name: string;
  color?: string;
};

type Member = {
  id: string;
  name: string;
  avatar_url?: string;
};

export type ResolvedContext = {
  sprint: Sprint;
  team: Team;
  roles: Role[];
  members: Member[];
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAppBase(url: URL): string {
  const appParam = url.searchParams.get('app') || process.env.DEFAULT_APP_BASE_URL;
  if (!appParam) {
    throw new Error('Missing app parameter. Add ?app=https://your-domain/team-assemble');
  }

  return appParam.endsWith('/') ? appParam.slice(0, -1) : appParam;
}

export function buildOrigin(url: URL): string {
  return `${url.protocol}//${url.host}`;
}

function getSupabaseAdmin() {
  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceRole = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  return createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false },
  });
}

export async function resolveContext(params: { teamId?: string | null; sprintId?: string | null }): Promise<ResolvedContext> {
  const { teamId, sprintId } = params;
  const supabase = getSupabaseAdmin();

  let sprint: Sprint | null = null;

  if (sprintId) {
    const { data, error } = await supabase
      .from('lrn_sprints')
      .select('*')
      .eq('id', sprintId)
      .single();

    if (error || !data) {
      throw new Error('Sprint not found');
    }
    sprint = data as Sprint;
  } else {
    if (!teamId) {
      throw new Error('Missing team parameter');
    }

    const { data, error } = await supabase
      .from('lrn_sprints')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error('Could not resolve active sprint');
    }

    sprint = ((data || [])[0] || null) as Sprint | null;
    if (!sprint) {
      throw new Error('No active sprint found for this team');
    }
  }

  const [teamRes, rolesRes, membersRes] = await Promise.all([
    supabase.from('lrn_teams').select('id, name').eq('id', sprint.team_id).single(),
    supabase.from('lrn_roles').select('id, name, color').eq('team_id', sprint.team_id).order('created_at', { ascending: true }),
    supabase.from('lrn_team_members').select('member_id, lrn_members(id, name, avatar_url)').eq('team_id', sprint.team_id),
  ]);

  if (teamRes.error || !teamRes.data) {
    throw new Error('Team not found');
  }

  const members = (membersRes.data || [])
    .map((entry: { lrn_members: Member | null }) => entry.lrn_members)
    .filter(Boolean) as Member[];

  return {
    sprint,
    team: teamRes.data as Team,
    roles: (rolesRes.data || []) as Role[],
    members,
  };
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
