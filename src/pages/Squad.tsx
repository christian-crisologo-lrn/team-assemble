import { useState, useMemo } from 'react';
import { useSprintStore } from '../store/useSprintStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { MemberCard } from '../components/features/squad/MemberCard';
import { Plus, User, X, Clock, CheckCircle2, CalendarClock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Member } from '../types';

export default function Squad() {
    const { members, roles, sprints, addMember, updateMember, removeMember } = useSprintStore();
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [historyMember, setHistoryMember] = useState<Member | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        if (editingId) {
            updateMember(editingId, { name: name.trim(), avatar_url: avatarUrl.trim() });
            setEditingId(null);
        } else {
            addMember(name.trim(), avatarUrl.trim());
        }
        setName('');
        setAvatarUrl('');
    };

    const startEdit = (member: { id: string; name: string; avatar_url?: string }) => {
        setEditingId(member.id);
        setName(member.name);
        setAvatarUrl(member.avatar_url || '');
    };

    const handleCancel = () => {
        setEditingId(null);
        setName('');
        setAvatarUrl('');
    };

    // Derive role history for the selected member across all sprints
    const historyEntries = useMemo(() => {
        if (!historyMember) return [];
        return sprints
            .filter(s => Object.values(s.assignments).includes(historyMember.id))
            .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
            .map(s => {
                const roleId = Object.keys(s.assignments).find(
                    rid => s.assignments[rid] === historyMember.id
                );
                const role = roles.find(r => r.id === roleId);
                return { sprint: s, role };
            });
    }, [historyMember, sprints, roles]);

    const pastEntries = historyEntries.filter(e => e.sprint.status === 'completed');
    const activeEntry = historyEntries.find(e => e.sprint.status === 'active');
    const upcomingEntries = historyEntries.filter(e => e.sprint.status === 'planning');

    return (
        <div className="space-y-6">

            {/* Member History Modal */}
            {historyMember && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl bg-white text-black border-2">
                        <div className="flex items-center justify-between p-6 border-b">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full overflow-hidden bg-secondary flex items-center justify-center border-2 border-primary/20">
                                    {historyMember.avatar_url
                                        ? <img src={historyMember.avatar_url} alt={historyMember.name} className="h-full w-full object-cover" />
                                        : <User className="h-5 w-5 text-muted-foreground" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-tight">{historyMember.name}</h3>
                                    <p className="text-xs text-muted-foreground">Role History</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setHistoryMember(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <CardContent className="p-6 space-y-6">
                            {historyEntries.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">
                                    No sprint assignments found for this member.
                                </p>
                            )}

                            {/* Active */}
                            {activeEntry && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-green-600 font-semibold text-sm uppercase tracking-wider">
                                        <Clock className="h-4 w-4" />
                                        Current Sprint
                                    </div>
                                    <HistoryRow entry={activeEntry} />
                                </div>
                            )}

                            {/* Upcoming */}
                            {upcomingEntries.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-blue-500 font-semibold text-sm uppercase tracking-wider">
                                        <CalendarClock className="h-4 w-4" />
                                        Upcoming ({upcomingEntries.length})
                                    </div>
                                    <div className="space-y-2">
                                        {upcomingEntries.map(e => <HistoryRow key={e.sprint.id} entry={e} />)}
                                    </div>
                                </div>
                            )}

                            {/* Past */}
                            {pastEntries.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-muted-foreground font-semibold text-sm uppercase tracking-wider">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Past ({pastEntries.length})
                                    </div>
                                    <div className="space-y-2">
                                        {[...pastEntries].reverse().map(e => <HistoryRow key={e.sprint.id} entry={e} />)}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Squad</h2>
                    <p className="text-muted-foreground">Manage your team members here.</p>
                </div>
            </div>

            <Card>
                <CardContent className="p-4">
                    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-2">
                        <Input
                            placeholder={editingId ? "Edit member name..." : "Enter new member name..."}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="flex-1"
                        />
                        <Input
                            placeholder="Avatar URL (optional)..."
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            className="flex-1"
                        />
                        <div className="flex gap-2">
                            {editingId && (
                                <Button type="button" variant="outline" onClick={handleCancel}>
                                    Cancel
                                </Button>
                            )}
                            <Button type="submit">
                                <Plus className="h-4 w-4 mr-2" /> {editingId ? 'Save' : 'Add'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {members.map((member) => (
                    <MemberCard
                        key={member.id}
                        member={member}
                        onEdit={startEdit}
                        onRemove={removeMember}
                        onViewHistory={setHistoryMember}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Helper ──────────────────────────────────────────────────────────────────

type HistoryEntry = {
    sprint: import('../types').Sprint;
    role: import('../types').Role | undefined;
};

function HistoryRow({ entry }: { entry: HistoryEntry }) {
    const { sprint, role } = entry;

    const statusStyles: Record<string, string> = {
        active: 'bg-green-50 border-green-200',
        planning: 'bg-blue-50 border-blue-200',
        completed: 'bg-muted/30 border-border',
    };

    const badgeStyles: Record<string, string> = {
        active: 'bg-green-100 text-green-700',
        planning: 'bg-blue-100 text-blue-700',
        completed: 'bg-gray-100 text-gray-500',
    };

    return (
        <div className={`flex items-center justify-between p-3 rounded-lg border ${statusStyles[sprint.status] || statusStyles.completed}`}>
            <div className="flex items-center gap-3 min-w-0">
                {role && (
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${role.color?.includes('bg-') ? role.color : 'bg-gray-400'}`} />
                )}
                <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{sprint.name}</p>
                    <p className="text-xs text-muted-foreground">
                        {format(parseISO(sprint.start_date), 'MMM d, yyyy')} – {format(parseISO(sprint.end_date), 'MMM d, yyyy')}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {role && (
                    <span className="text-xs font-medium text-muted-foreground hidden sm:block">{role.name}</span>
                )}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${badgeStyles[sprint.status] || badgeStyles.completed}`}>
                    {sprint.status}
                </span>
            </div>
        </div>
    );
}
