import { useState } from 'react';
import { useSprintStore } from '../store/useSprintStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Plus, Trash2, Edit2, Check } from 'lucide-react';
import { IconPicker, DynamicIcon } from '../components/ui/IconPicker';
import type { Role } from '../types';

export default function Roles() {
    const { roles, addRole, updateRole, removeRole } = useSprintStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState('bg-blue-500');
    const [icon, setIcon] = useState('Shield');

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setColor('bg-blue-500');
        setIcon('Shield');
        setIsAdding(false);
        setEditingId(null);
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        addRole({
            id: crypto.randomUUID(),
            name: title,
            description,
            color,
            icon,
        });
        resetForm();
    };

    const startEdit = (role: Role) => {
        setEditingId(role.id);
        setTitle(role.name);
        setDescription(role.description || '');
        setColor(role.color);
        setIcon(role.icon || 'Shield');
        setIsAdding(false);
    };

    const handleUpdate = () => {
        if (!editingId || !title.trim()) return;
        updateRole(editingId, {
            name: title,
            description,
            color,
            icon
        });
        resetForm();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Roles</h2>
                    <p className="text-muted-foreground">Define the roles for your sprint rotations.</p>
                </div>
                {!isAdding && !editingId && (
                    <Button onClick={() => setIsAdding(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Role
                    </Button>
                )}
            </div>

            {/* Editor Card */}
            {(isAdding || editingId) && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle>{isAdding ? 'New Role' : 'Edit Role'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Title</label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Facilitator"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What does this role do?"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Icon</label>
                            <IconPicker selectedIcon={icon} onSelect={setIcon} />
                        </div>
                        {/* Simple Color Picker mock */}
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Color Class</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                            >
                                <option value="bg-red-500">Red</option>
                                <option value="bg-blue-500">Blue</option>
                                <option value="bg-green-500">Green</option>
                                <option value="bg-yellow-500">Yellow</option>
                                <option value="bg-purple-500">Purple</option>
                                <option value="bg-pink-500">Pink</option>
                                <option value="bg-indigo-500">Indigo</option>
                            </select>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={resetForm}>Cancel</Button>
                        <Button onClick={isAdding ? handleCreate : handleUpdate}>
                            <Check className="mr-2 h-4 w-4" /> Save
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* Roles List */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {roles.map((role) => (
                    <Card key={role.id} className="relative group overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1 h-full ${role.color}`} />
                        <CardHeader className="pb-2">
                            <CardTitle className="flex justify-between items-start">
                                <span>{role.name}</span>
                                <div className="text-muted-foreground/30">
                                    <DynamicIcon name={role.icon} className="h-6 w-6" />
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground min-h-[40px]">
                                {role.description || "No description provided."}
                            </p>
                        </CardContent>
                        <CardFooter className="pt-0 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" onClick={() => startEdit(role)}>
                                <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeRole(role.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
