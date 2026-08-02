import { useState } from 'react';
import { useSprintStore } from '../store/useSprintStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { MemberCard } from '../components/features/squad/MemberCard';
import { Plus } from 'lucide-react';

export default function Squad() {
    const { members, addMember, updateMember, removeMember } = useSprintStore();
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

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

    return (
        <div className="space-y-6">
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
                    />
                ))}
            </div>
        </div>
    );
}
