import { create } from 'zustand';
import type { Member, Role, Sprint, Team } from '../types';
import { supabase } from '../lib/supabase';
import { ERROR_MESSAGES, getFriendlyErrorMessage } from '../utils/errors';

interface SprintStore {
    currentTeam: Team | null;
    members: Member[];
    roles: Role[];
    sprints: Sprint[];
    currentSprintId: string | null;
    isLoading: boolean;
    isOffline: boolean;
    isUsingSampleData: boolean;

    // Actions
    setTeam: (team: Team | null) => void;
    loginTeam: (name: string, password: string) => Promise<{ success: boolean; error?: string }>;
    createTeam: (name: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;

    fetchInitialData: () => Promise<void>;
    addMember: (name: string, avatarUrl?: string) => Promise<void>;
    updateMember: (id: string, updates: Partial<Member>) => Promise<void>;
    removeMember: (id: string) => Promise<void>;

    addRole: (role: Omit<Role, 'team_id'>) => Promise<void>;
    updateRole: (id: string, updates: Partial<Role>) => Promise<void>;
    removeRole: (id: string) => Promise<void>;

    addSprints: (sprints: Omit<Sprint, 'team_id'>[]) => Promise<void>;
    updateSprint: (id: string, updates: Partial<Sprint>) => Promise<void>;
    startSprint: (sprint: Omit<Sprint, 'team_id'>) => Promise<void>;
    setCurrentSprint: (id: string) => void;
    setSprints: (sprints: Omit<Sprint, 'team_id'>[]) => Promise<void>;
    deleteSprints: (ids: string[]) => Promise<void>;
}

const STORAGE_KEY = 'lrn_sprint_offline_data';
const TEAM_KEY = 'lrn_sprint_team';

export const useSprintStore = create<SprintStore>((set, get) => ({
    currentTeam: JSON.parse(localStorage.getItem(TEAM_KEY) || 'null'),
    members: [],
    roles: [],
    sprints: [],
    currentSprintId: null,
    isLoading: false,
    isOffline: !navigator.onLine,
    isUsingSampleData: false,

    setTeam: (team) => {
        set({ currentTeam: team });
        if (team) {
            localStorage.setItem(TEAM_KEY, JSON.stringify(team));
            get().fetchInitialData();
        } else {
            localStorage.removeItem(TEAM_KEY);
            set({ members: [], roles: [], sprints: [], currentSprintId: null });
        }
    },

    loginTeam: async (name, password) => {
        set({ isLoading: true });
        const normalizedName = name.trim().toLowerCase();
        try {
            const { data, error } = await supabase
                .from('lrn_teams')
                .select('*')
                .eq('name', normalizedName)
                .eq('password', password)
                .single();

            if (error) {
                set({ isLoading: false });
                return {
                    success: false,
                    error: getFriendlyErrorMessage(error, {
                        action: 'log you in',
                        fallback: ERROR_MESSAGES.loginFailed
                    })
                };
            }

            if (!data) {
                set({ isLoading: false });
                return { success: false, error: ERROR_MESSAGES.invalidCredentials };
            }

            get().setTeam(data);
            set({ isLoading: false });
            return { success: true };
        } catch (error) {
            set({ isLoading: false });
            return {
                success: false,
                error: getFriendlyErrorMessage(error, {
                    action: 'log you in',
                    fallback: ERROR_MESSAGES.loginFailed
                })
            };
        }
    },

    createTeam: async (name, password) => {
        set({ isLoading: true });
        const normalizedName = name.trim().toLowerCase();
        try {
            const { data, error } = await supabase
                .from('lrn_teams')
                .insert([{ name: normalizedName, password }])
                .select()
                .single();

            if (error) {
                set({ isLoading: false });
                return {
                    success: false,
                    error: getFriendlyErrorMessage(error, {
                        action: 'create your team',
                        fallback: ERROR_MESSAGES.createTeamFailed
                    })
                };
            }

            get().setTeam(data);
            set({ isLoading: false });
            return { success: true };
        } catch (error) {
            set({ isLoading: false });
            return {
                success: false,
                error: getFriendlyErrorMessage(error, {
                    action: 'create your team',
                    fallback: ERROR_MESSAGES.createTeamFailed
                })
            };
        }
    },

    logout: () => {
        get().setTeam(null);
    },

    fetchInitialData: async () => {
        const { currentTeam } = get();
        if (!currentTeam) return;

        set({ isLoading: true, isOffline: !navigator.onLine });

        if (navigator.onLine) {
            try {
                const delayPromise = new Promise(resolve => setTimeout(resolve, 2000));

                const [fetchResults] = await Promise.all([
                    Promise.all([
                        // Fetch members through join table
                        supabase
                            .from('lrn_team_members')
                            .select('member_id, lrn_members(*)')
                            .eq('team_id', currentTeam.id),
                        supabase
                            .from('lrn_roles')
                            .select('*')
                            .eq('team_id', currentTeam.id)
                            .order('created_at', { ascending: true }),
                        supabase
                            .from('lrn_sprints')
                            .select('*')
                            .eq('team_id', currentTeam.id)
                            .order('start_date', { ascending: true })
                    ]),
                    delayPromise
                ]);

                const [
                    { data: teamMembers, error: tmErr },
                    { data: roles, error: rErr },
                    { data: sprints, error: sErr }
                ] = fetchResults;

                if (!tmErr && !rErr && !sErr) {
                    const members = (teamMembers?.map((tm: Record<string, unknown>) => tm.lrn_members).filter(Boolean) || []) as Member[];
                    const data = {
                        members,
                        roles: roles || [],
                        sprints: sprints || [],
                        currentSprintId: sprints?.find((s: Sprint) => s.status === 'active')?.id || null
                    };
                    set({ ...data, isLoading: false, isUsingSampleData: false });
                    localStorage.setItem(`${STORAGE_KEY}_${currentTeam.id}`, JSON.stringify(data));
                    return;
                }
            } catch (error) {
                console.warn('Supabase fetch failed, falling back to local storage', error);
            }
        }

        // Offline or Supabase failed
        const cached = localStorage.getItem(`${STORAGE_KEY}_${currentTeam.id}`);
        if (cached) {
            const parsed = JSON.parse(cached);
            set({ ...parsed, isLoading: false, isOffline: true, isUsingSampleData: false });
        } else {
            set({
                members: [],
                roles: [],
                sprints: [],
                isLoading: false,
                isOffline: true,
                isUsingSampleData: false
            });
        }
    },

    addMember: async (name, avatarUrl) => {
        const { isOffline, members, currentTeam } = get();
        if (!currentTeam) return;

        const newMember = {
            id: crypto.randomUUID(),
            name,
            avatar_url: avatarUrl,
            active: true,
            created_at: new Date().toISOString()
        };

        if (!isOffline) {
            // Transaction-like approach (Supabase doesn't support easy transactions without RPC)
            const { error: mErr } = await supabase.from('lrn_members').insert([newMember]);
            if (!mErr) {
                await supabase.from('lrn_team_members').insert([{
                    team_id: currentTeam.id,
                    member_id: newMember.id
                }]);
            } else {
                console.error('Error adding member:', mErr);
            }
        }

        const updatedMembers = [...members, newMember];
        set({ members: updatedMembers });
        localStorage.setItem(`${STORAGE_KEY}_${currentTeam.id}`, JSON.stringify({ ...get(), members: updatedMembers }));
    },

    updateMember: async (id, updates) => {
        const { isOffline, members, currentTeam } = get();
        if (!currentTeam) return;

        if (!isOffline) {
            const { error } = await supabase.from('lrn_members').update(updates).eq('id', id);
            if (error) console.error('Error updating member:', error);
        }

        const updatedMembers = members.map((m) => m.id === id ? { ...m, ...updates } : m);
        set({ members: updatedMembers });
        localStorage.setItem(`${STORAGE_KEY}_${currentTeam.id}`, JSON.stringify({ ...get(), members: updatedMembers }));
    },

    removeMember: async (id) => {
        const { isOffline, members, currentTeam } = get();
        if (!currentTeam) return;

        if (!isOffline) {
            // Delete from lrn_team_members first is handled by cascade if member is deleted, 
            // but we might want to just remove them from the team.
            // For now, let's delete the member globally (MVP approach).
            const { error } = await supabase.from('lrn_members').delete().eq('id', id);
            if (error) console.error('Error removing member:', error);
        }

        const updatedMembers = members.filter((m) => m.id !== id);
        set({ members: updatedMembers });
        localStorage.setItem(`${STORAGE_KEY}_${currentTeam.id}`, JSON.stringify({ ...get(), members: updatedMembers }));
    },

    addRole: async (role) => {
        const { isOffline, roles, currentTeam } = get();
        if (!currentTeam) return;

        const roleWithTeam = { ...role, team_id: currentTeam.id };

        if (!isOffline) {
            const { error } = await supabase.from('lrn_roles').insert([roleWithTeam]);
            if (error) console.error('Error adding role:', error);
        }

        const updatedRoles = [...roles, roleWithTeam];
        set({ roles: updatedRoles });
        localStorage.setItem(`${STORAGE_KEY}_${currentTeam.id}`, JSON.stringify({ ...get(), roles: updatedRoles }));
    },

    updateRole: async (id, updates) => {
        const { isOffline, roles, currentTeam } = get();
        if (!currentTeam) return;

        if (!isOffline) {
            const { error } = await supabase.from('lrn_roles').update(updates).eq('id', id);
            if (error) console.error('Error updating role:', error);
        }

        const updatedRoles = roles.map((r) => r.id === id ? { ...r, ...updates } : r);
        set({ roles: updatedRoles });
        localStorage.setItem(`${STORAGE_KEY}_${currentTeam.id}`, JSON.stringify({ ...get(), roles: updatedRoles }));
    },

    removeRole: async (id) => {
        const { isOffline, roles, currentTeam } = get();
        if (!currentTeam) return;

        if (!isOffline) {
            const { error } = await supabase.from('lrn_roles').delete().eq('id', id);
            if (error) console.error('Error removing role:', error);
        }

        const updatedRoles = roles.filter((r) => r.id !== id);
        set({ roles: updatedRoles });
        localStorage.setItem(`${STORAGE_KEY}_${currentTeam.id}`, JSON.stringify({ ...get(), roles: updatedRoles }));
    },

    addSprints: async (newSprints) => {
        const { isOffline, sprints, currentTeam } = get();
        if (!currentTeam) return;

        const sprintsWithTeam = newSprints.map(s => ({ ...s, team_id: currentTeam.id }));

        if (!isOffline) {
            const { error } = await supabase.from('lrn_sprints').insert(sprintsWithTeam);
            if (error) console.error('Error adding sprints:', error);
        }

        const updatedSprints = [...sprints, ...sprintsWithTeam];
        set({ sprints: updatedSprints });
        localStorage.setItem(`${STORAGE_KEY}_${currentTeam.id}`, JSON.stringify({ ...get(), sprints: updatedSprints }));
    },

    updateSprint: async (id, updates) => {
        const { isOffline, sprints, currentTeam } = get();
        if (!currentTeam) return;

        if (!isOffline) {
            const { error } = await supabase.from('lrn_sprints').update(updates).eq('id', id);
            if (error) console.error('Error updating sprint:', error);
        }

        const updatedSprints = sprints.map((s) => s.id === id ? { ...s, ...updates } : s);
        set({ sprints: updatedSprints });
        localStorage.setItem(`${STORAGE_KEY}_${currentTeam.id}`, JSON.stringify({ ...get(), sprints: updatedSprints }));
    },

    startSprint: async (sprint) => {
        const { isOffline, sprints, currentTeam } = get();
        if (!currentTeam) return;

        const sprintWithTeam = { ...sprint, team_id: currentTeam.id };

        if (!isOffline) {
            const { error } = await supabase.from('lrn_sprints').insert([sprintWithTeam]);
            if (error) console.error('Error starting sprint:', error);
        }

        const updatedSprints = [...sprints, sprintWithTeam];
        set({ sprints: updatedSprints, currentSprintId: sprint.id });
        localStorage.setItem(`${STORAGE_KEY}_${currentTeam.id}`, JSON.stringify({ ...get(), sprints: updatedSprints, currentSprintId: sprint.id }));
    },

    setCurrentSprint: (id) => {
        const { currentTeam } = get();
        if (!currentTeam) return;
        set({ currentSprintId: id });
        localStorage.setItem(`${STORAGE_KEY}_${currentTeam.id}`, JSON.stringify({ ...get(), currentSprintId: id }));
    },

    setSprints: async (sprints) => {
        const { isOffline, currentTeam } = get();
        if (!currentTeam) return;

        const sprintsWithTeam = sprints.map(s => ({ ...s, team_id: currentTeam.id }));

        if (!isOffline) {
            const { error } = await supabase.from('lrn_sprints').upsert(sprintsWithTeam);
            if (error) console.error('Error setting sprints:', error);
        }

        set({ sprints: sprintsWithTeam });
        localStorage.setItem(`${STORAGE_KEY}_${currentTeam.id}`, JSON.stringify({ ...get(), sprints: sprintsWithTeam }));
    },

    deleteSprints: async (ids) => {
        const { isOffline, sprints, currentTeam } = get();
        if (!currentTeam || ids.length === 0) return;

        if (!isOffline) {
            const { error } = await supabase.from('lrn_sprints').delete().in('id', ids);
            if (error) console.error('Error deleting sprints:', error);
        }

        const updatedSprints = sprints.filter(s => !ids.includes(s.id));
        set({ sprints: updatedSprints });
        localStorage.setItem(`${STORAGE_KEY}_${currentTeam.id}`, JSON.stringify({ ...get(), sprints: updatedSprints }));
    },
}));

// Listen for network changes
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => useSprintStore.setState({ isOffline: false }));
    window.addEventListener('offline', () => useSprintStore.setState({ isOffline: true }));
}

