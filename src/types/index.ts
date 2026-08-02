export interface Team {
    id: string;
    name: string;
    password?: string;
    created_at: string;
}

export interface Member {
    id: string;
    name: string;
    avatar_url?: string;
    active: boolean;
    created_at: string;
}

export interface TeamMember {
    id: string;
    team_id: string;
    member_id: string;
    created_at: string;
}

export interface Role {
    id: string;
    team_id: string;
    name: string;
    color: string; // Tailwind color class or hex
    description?: string;
    icon?: string; // Lucide icon name
}

export type SprintStatus = 'planning' | 'active' | 'completed';

export interface Sprint {
    id: string;
    team_id: string;
    name: string;
    start_date: string;
    end_date: string;
    status: SprintStatus;
    assignments: Record<string, string>; // RoleID -> MemberID
    created_at: string;
}

export interface AppState {
    currentTeam: Team | null;
    members: Member[];
    roles: Role[];
    sprints: Sprint[];
    currentSprintId: string | null;
}
