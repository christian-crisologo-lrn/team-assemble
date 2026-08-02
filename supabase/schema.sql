-- 1. Teams Table
create table lrn_teams (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  password text not null,
  created_at timestamptz default now()
);

-- 2. Members Table
create table lrn_members (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  avatar_url text,
  active boolean default true,
  created_at timestamptz default now()
);

-- 3. Team Members Join Table (Many-to-Many)
create table lrn_team_members (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references lrn_teams(id) on delete cascade,
  member_id uuid references lrn_members(id) on delete cascade,
  created_at timestamptz default now(),
  unique(team_id, member_id)
);

-- 4. Roles Table
create table lrn_roles (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references lrn_teams(id) on delete cascade,
  name text not null,
  description text,
  color text default 'bg-blue-500',
  icon text default 'Shield',
  created_at timestamptz default now()
);

-- 5. Sprints Table
create table lrn_sprints (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references lrn_teams(id) on delete cascade,
  name text not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  status text check (status in ('planning', 'active', 'completed')),
  assignments jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Enable RLS
alter table lrn_teams enable row level security;
alter table lrn_members enable row level security;
alter table lrn_team_members enable row level security;
alter table lrn_roles enable row level security;
alter table lrn_sprints enable row level security;

-- Create Policies (Public Access for MVP, but logically scoped by team_id in application)
create policy "Public Select Teams" on lrn_teams for select using (true);
create policy "Public Insert Teams" on lrn_teams for insert with check (true);

create policy "Public Select Members" on lrn_members for select using (true);
create policy "Public Insert Members" on lrn_members for insert with check (true);
create policy "Public Update Members" on lrn_members for update using (true);
create policy "Public Delete Members" on lrn_members for delete using (true);

create policy "Public Select Team Members" on lrn_team_members for select using (true);
create policy "Public Insert Team Members" on lrn_team_members for insert with check (true);
create policy "Public Delete Team Members" on lrn_team_members for delete using (true);

create policy "Public Select Roles" on lrn_roles for select using (true);
create policy "Public Insert Roles" on lrn_roles for insert with check (true);
create policy "Public Update Roles" on lrn_roles for update using (true);
create policy "Public Delete Roles" on lrn_roles for delete using (true);

create policy "Public Select Sprints" on lrn_sprints for select using (true);
create policy "Public Insert Sprints" on lrn_sprints for insert with check (true);
create policy "Public Update Sprints" on lrn_sprints for update using (true);
create policy "Public Delete Sprints" on lrn_sprints for delete using (true);
