import { useState, useMemo } from 'react';
import { useSprintStore } from '../store/useSprintStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { addDays, format, parseISO } from 'date-fns';
import { Save, Calendar, Pencil, Trash2, Users, Shield, Plus, GripVertical, ArrowUpDown, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import { rotateSequential, rotateRandom } from '../utils/rotation';
import { addWeekdays } from '../utils/weekday';
import type { Sprint } from '../types';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Dialog } from '../components/ui/dialog';
import { useNavigate } from 'react-router-dom';

type SortKey = 'name' | 'start_date' | 'status';
type SortOrder = 'asc' | 'desc';

function getSprintNameSeed(nameInput: string): { baseName: string; startingNumber: number } {
    const trimmed = nameInput.trim();
    if (!trimmed) return { baseName: 'Sprint', startingNumber: 1 };

    const trailingNumberMatch = trimmed.match(/^(.*?)(?:\s+)?(\d+)$/);
    if (!trailingNumberMatch) {
        return { baseName: trimmed, startingNumber: 1 };
    }

    const baseName = trailingNumberMatch[1].trim() || 'Sprint';
    const startingNumber = parseInt(trailingNumberMatch[2], 10);

    return {
        baseName,
        startingNumber: Number.isNaN(startingNumber) ? 1 : startingNumber
    };
}

export default function SprintPlanner() {
    const { members, roles, sprints, addSprints, updateSprint, setSprints, deleteSprints } = useSprintStore();
    const [step, setStep] = useState(0); // 0 = List View, 1 = Config, 2 = Strategy, 3 = Review
    const [editingSprint, setEditingSprint] = useState<Omit<Sprint, 'team_id'> | null>(null);
    const navigate = useNavigate();

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: SortKey, order: SortOrder }>({ key: 'start_date', order: 'asc' });

    const sortedSprints = useMemo(() => {
        const sorted = [...sprints].sort((a, b) => {
            if (sortConfig.key === 'start_date') {
                return sortConfig.order === 'asc'
                    ? new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
                    : new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
            }
            if (sortConfig.key === 'name') {
                return sortConfig.order === 'asc'
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            }
            if (sortConfig.key === 'status') {
                return sortConfig.order === 'asc'
                    ? a.status.localeCompare(b.status)
                    : b.status.localeCompare(a.status);
            }
            return 0;
        });
        return sorted;
    }, [sprints, sortConfig]);

    const handleSort = (key: SortKey) => {
        setSortConfig(prev => ({
            key,
            order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === sprints.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(sprints.map(s => s.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    // Modal State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleBulkDelete = async () => {
        const idsToDelete = Array.from(selectedIds);

        // Update Supabase and State (Directly, no ripple)
        await deleteSprints(idsToDelete);

        setSelectedIds(new Set());
        setIsDeleteDialogOpen(false);
    };

    const hasConflict = (current: Sprint) => {
        return sprints.some(s =>
            s.id !== current.id &&
            s.start_date === current.start_date &&
            s.end_date === current.end_date
        );
    };

    const onDragEnd = async (result: DropResult) => {
        if (!result.destination) return;
        if (result.destination.index === result.source.index) return;

        // If sorted by something other than date, DnD can be confusing but let's allow reordering.
        const newItems = Array.from(sortedSprints);
        const [reorderedItem] = newItems.splice(result.source.index, 1);
        newItems.splice(result.destination.index, 0, reorderedItem);

        // Update with NO recalculation of dates.
        await setSprints(newItems);
    };

    const saveEdit = async () => {
        if (editingSprint) {
            const exists = sprints.some(s => s.id === editingSprint.id);
            if (exists) {
                await updateSprint(editingSprint.id, editingSprint);
            } else {
                await addSprints([editingSprint]);
            }
            setEditingSprint(null);
        }
    };

    const addSingleSprint = () => {
        const lastSprint = sortedSprints[sortedSprints.length - 1];
        const durationWeekdays = durationWeekdayCount;
        const { baseName, nextNumber } = getNextSprintNumber();

        let newStart = new Date();
        if (lastSprint) {
            newStart = addDays(new Date(lastSprint.end_date), 1);
        }

        const newEnd = excludeWeekends
            ? addWeekdays(newStart, durationWeekdays)
            : addDays(newStart, durationWeekdays - 1);
        const lastAssignments = lastSprint ? lastSprint.assignments : {};
        const assignments = rotateSequential(members, roles, lastAssignments);

        const newSprint: Omit<Sprint, 'team_id'> = {
            id: crypto.randomUUID(),
            name: `${baseName} ${nextNumber}`,
            start_date: newStart.toISOString(),
            end_date: newEnd.toISOString(),
            status: sprints.some(s => s.status === 'active') ? 'planning' : 'active',
            assignments: assignments,
            created_at: new Date().toISOString()
        };

        setEditingSprint(newSprint);
    };

    // Step 1: Config Initial values
    const [sprintNamePrefix, setSprintNamePrefix] = useState('Sprint');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [sprintCount, setSprintCount] = useState(5);
    const [durationWeekdayCount, setDurationWeekdayCount] = useState(10);
    const [excludeWeekends, setExcludeWeekends] = useState(true);

    // Step 2: Strategy
    const [strategy, setStrategy] = useState<'sequential' | 'random'>('sequential');

    // Step 3: Draft
    const [draftSprints, setDraftSprints] = useState<Omit<Sprint, 'team_id'>[]>([]);

    const getNextSprintNumber = () => {
        const { baseName, startingNumber } = getSprintNameSeed(sprintNamePrefix);
        const escapedBaseName = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existingNumbers = sprints.map(s => {
            const match = s.name.match(new RegExp(`^${escapedBaseName} (\\d+)$`));
            return match ? parseInt(match[1], 10) : 0;
        });

        return {
            baseName,
            nextNumber: Math.max(startingNumber - 1, ...existingNumbers) + 1
        };
    };

    const generateDrafts = () => {
        let currentStart = new Date(startDate);
        const newSprints: Omit<Sprint, 'team_id'>[] = [];
        const durationWeekdays = durationWeekdayCount;
        let lastAssignments = sprints.length > 0 ? sprints[sprints.length - 1].assignments : {};
        const { baseName, nextNumber: initialNextNumber } = getNextSprintNumber();
        let nextNumber = initialNextNumber;

        for (let i = 0; i < sprintCount; i++) {
            const startStr = currentStart.toISOString();
            const end = excludeWeekends
                ? addWeekdays(currentStart, durationWeekdays)
                : addDays(currentStart, durationWeekdays - 1);
            const endStr = end.toISOString();

            let assignments = strategy === 'sequential'
                ? rotateSequential(members, roles, lastAssignments)
                : rotateRandom(members, roles, lastAssignments);

            newSprints.push({
                id: crypto.randomUUID(),
                name: `${baseName} ${nextNumber++}`,
                start_date: startStr,
                end_date: endStr,
                status: (i === 0 && !sprints.some(s => s.status === 'active')) ? 'active' : 'planning',
                assignments: assignments,
                created_at: new Date().toISOString()
            });

            lastAssignments = assignments;
            currentStart = addDays(end, 1);
        }

        setDraftSprints(newSprints);
        setStep(3);
    };

    const saveDrafts = () => {
        addSprints(draftSprints);
        setStep(0);
        setDraftSprints([]);
    };

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortConfig.key !== column) return <ArrowUpDown className="ml-2 h-3 w-3" />;
        return sortConfig.order === 'asc' ? <ChevronUp className="ml-2 h-3 w-3" /> : <ChevronDown className="ml-2 h-3 w-3" />;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Sprint Planner</h2>
                    <p className="text-muted-foreground">Bulk create and schedule your upcoming sprints.</p>
                </div>
                {step === 0 && (
                    <div className="flex gap-2">
                        {selectedIds.size > 0 && (
                            <Button
                                variant="destructive"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => setIsDeleteDialogOpen(true)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedIds.size})
                            </Button>
                        )}
                        <Button onClick={() => {
                            // Auto-set start date to day after last sprint ends
                            if (sortedSprints.length > 0) {
                                const lastSprint = sortedSprints[sortedSprints.length - 1];
                                const nextStart = addDays(new Date(lastSprint.end_date), 1);
                                setStartDate(nextStart.toISOString().split('T')[0]);
                            }
                            setStep(1);
                        }}>
                            <Calendar className="mr-2 h-4 w-4" /> Plan New Sprints
                        </Button>
                    </div>
                )}
            </div>

            <Dialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                title="Confirm Bulk Deletion"
                description={`Are you sure you want to delete ${selectedIds.size} selected sprint(s)? This action cannot be undone.`}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleBulkDelete}>
                            Delete Sprints
                        </Button>
                    </>
                }
            >
                <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm flex gap-3 border border-red-100">
                    <Trash2 className="h-5 w-5 shrink-0" />
                    <p>
                        Selected sprints will be permanently removed from your schedule.
                    </p>
                </div>
            </Dialog>

            {step === 0 && (
                <div className="space-y-4">
                    {editingSprint && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl bg-white text-black border-2">
                                <CardHeader>
                                    <CardTitle>
                                        {sprints.some(s => s.id === editingSprint.id) ? 'Edit Sprint' : 'Add Sprint'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Sprint Name</label>
                                        <Input
                                            value={editingSprint.name}
                                            onChange={(e) => setEditingSprint({ ...editingSprint, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Start Date</label>
                                            <Input
                                                type="date"
                                                value={editingSprint.start_date.split('T')[0]}
                                                onChange={(e) => setEditingSprint({ ...editingSprint, start_date: new Date(e.target.value).toISOString() })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">End Date</label>
                                            <Input
                                                type="date"
                                                value={editingSprint.end_date.split('T')[0]}
                                                onChange={(e) => setEditingSprint({ ...editingSprint, end_date: new Date(e.target.value).toISOString() })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Status</label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={editingSprint.status}
                                            onChange={(e) => setEditingSprint({ ...editingSprint, status: e.target.value as 'planning' | 'active' | 'completed' })}
                                        >
                                            <option value="planning">Planning</option>
                                            <option value="active">Active</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="font-medium">Assignments</h4>
                                        {roles.map(role => (
                                            <div key={role.id} className="flex items-center justify-between p-2 border rounded bg-accent/5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full ${role.color.includes('bg-') ? role.color : 'bg-gray-500'}`} />
                                                    <span className="text-sm font-medium">{role.name}</span>
                                                </div>
                                                <select
                                                    className="p-1 rounded border bg-background text-sm w-40"
                                                    value={editingSprint.assignments[role.id] || ''}
                                                    onChange={(e) => {
                                                        const newAssignments = { ...editingSprint.assignments, [role.id]: e.target.value };
                                                        setEditingSprint({ ...editingSprint, assignments: newAssignments });
                                                    }}
                                                >
                                                    <option value="">Unassigned</option>
                                                    {members.map(m => (
                                                        <option key={m.id} value={m.id}>{m.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button variant="outline" onClick={() => setEditingSprint(null)}>Cancel</Button>
                                        <Button onClick={saveEdit}>Save Changes</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {members.length === 0 || roles.length === 0 ? (
                        <Card className="border-dashed bg-muted/5">
                            <CardContent className="flex flex-col items-center justify-center p-12 space-y-6 text-center">
                                <div className="flex gap-4">
                                    <div className="p-4 rounded-full bg-background border shadow-sm">
                                        <Users className={`h-8 w-8 ${members.length === 0 ? 'text-muted-foreground opacity-50' : 'text-primary'}`} />
                                    </div>
                                    <div className="p-4 rounded-full bg-background border shadow-sm">
                                        <Shield className={`h-8 w-8 ${roles.length === 0 ? 'text-muted-foreground opacity-50' : 'text-primary'}`} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold">Rotation Planning Blocked</h3>
                                    <p className="text-muted-foreground max-w-md mx-auto mt-3">
                                        To generate a sprint plan and rotate roles, you first need to have **active members** and **defined roles**.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-sm">
                                    <Button variant={members.length === 0 ? "default" : "outline"} onClick={() => navigate('/squad')}>
                                        {members.length === 0 ? '1. Add Members' : 'Members Added ✅'}
                                    </Button>
                                    <Button variant={roles.length === 0 ? "default" : "outline"} onClick={() => navigate('/roles')}>
                                        {roles.length === 0 ? '2. Add Roles' : 'Roles Added ✅'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : sprints.length === 0 ? (
                        <Card className="bg-muted/10 border-dashed">
                            <CardContent className="flex flex-col items-center justify-center p-12 space-y-4 text-center">
                                <div className="p-4 rounded-full bg-background border">
                                    <Calendar className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">No Sprints Planned</h3>
                                    <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                                        Start by creating a plan for your upcoming sprints. You can generate multiple sprints at once.
                                    </p>
                                </div>
                                <Button onClick={() => setStep(1)}>Start Planning</Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                                            <tr>
                                                <th className="p-4 w-8">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                        checked={selectedIds.size === sprints.length && sprints.length > 0}
                                                        onChange={toggleSelectAll}
                                                    />
                                                </th>
                                                <th className="p-4 w8"></th>
                                                <th className="p-4 whitespace-nowrap cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('name')}>
                                                    <div className="flex items-center">Sprint Details <SortIcon column="name" /></div>
                                                </th>
                                                <th className="p-4">Assignments (Role → Member)</th>
                                                <th className="p-4 w-22 whitespace-nowrap cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('status')}>
                                                    <div className="flex items-center">Status <SortIcon column="status" /></div>
                                                </th>
                                                <th className="p-4 w-18 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <DragDropContext onDragEnd={onDragEnd}>
                                            <Droppable droppableId="sprints">
                                                {(provided) => (
                                                    <tbody
                                                        {...provided.droppableProps}
                                                        ref={provided.innerRef}
                                                        className="divide-y"
                                                    >
                                                        {sortedSprints.map((sprint, idx) => (
                                                            <Draggable key={sprint.id} draggableId={sprint.id} index={idx}>
                                                                {(provided, snapshot) => (
                                                                    <tr
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        className={`transition-colors ${snapshot.isDragging ? 'bg-accent shadow-lg ring-1 ring-primary/20' : sprint.status === 'active' ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/5'} ${sprint.status === 'active' ? 'border-l-4 border-l-primary' : ''}`}
                                                                    >
                                                                        <td className="p-4">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                                                checked={selectedIds.has(sprint.id)}
                                                                                onChange={() => toggleSelect(sprint.id)}
                                                                            />
                                                                        </td>
                                                                        <td className="p-4">
                                                                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary transition-colors">
                                                                                <GripVertical className="h-5 w-5" />
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-4 align-top">
                                                                            <div className="font-bold text-base flex items-center gap-2">
                                                                                {sprint.name}
                                                                                {sprint.status === 'active' && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">CURRENT</span>}
                                                                            </div>
                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                <div className="text-muted-foreground text-xs">
                                                                                    {format(parseISO(sprint.start_date), 'MMM d, yyyy')} - {format(parseISO(sprint.end_date), 'MMM d, yyyy')}
                                                                                </div>
                                                                                {hasConflict(sprint) && (
                                                                                    <div className="group relative">
                                                                                        <AlertTriangle className="h-4 w-4 text-amber-500 cursor-help" />
                                                                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden group-hover:block z-50 w-48 p-2 bg-gray-900 text-white text-[10px] rounded shadow-xl">
                                                                                            There's a duplicate sprint with these dates
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-4 align-top">
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                                                                                {roles.map(role => {
                                                                                    const memberId = sprint.assignments[role.id];
                                                                                    const member = members.find(m => m.id === memberId);
                                                                                    return (
                                                                                        <div key={role.id} className="flex items-center gap-2 py-0.5">
                                                                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${role.color.includes('bg-') ? role.color : 'bg-gray-500'}`} />
                                                                                            <span className="text-muted-foreground text-xs font-medium w-20 truncate" title={role.name}>{role.name}:</span>
                                                                                            <span className="font-medium truncate" title={member?.name || '-'}>{member?.name || '-'}</span>
                                                                                        </div>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-4 align-top">
                                                                            <span className={`px-2 py-1 rounded text-xs font-bold inline-block tracking-wide ${sprint.status === 'active' ? 'bg-green-500/10 text-green-600' : sprint.status === 'planning' ? 'bg-blue-400/10 text-gray-500' : 'bg-blue-400/10 text-blue-500'}`}>
                                                                                {(sprint.status || 'completed').toUpperCase()}
                                                                            </span>
                                                                        </td>
                                                                        <td className="p-4 align-top text-right">
                                                                            <Button size="sm" variant="ghost" onClick={() => setEditingSprint(sprint)} title="Edit Sprint">
                                                                                <Pencil className="h-4 w-4" />
                                                                                <span className="sr-only">Edit</span>
                                                                            </Button>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </tbody>
                                                )}
                                            </Droppable>
                                        </DragDropContext>
                                    </table>
                                </div>
                                <div className="p-4 border-t border-dashed bg-muted/5 flex justify-center">
                                    <Button variant="outline" onClick={addSingleSprint} className="w-full max-w-xs border-primary/20 hover:bg-primary/5 hover:text-primary transition-all">
                                        <Plus className="mr-2 h-4 w-4" /> Add Single Sprint
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {step === 1 && (
                <Card>
                    <CardHeader><CardTitle>1. Timeline Configuration</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <label>Sprint Name</label>
                            <Input
                                type="text"
                                value={sprintNamePrefix}
                                onChange={e => setSprintNamePrefix(e.target.value || 'Sprint')}
                                placeholder="Sprint"
                            />
                            <p className="text-xs text-muted-foreground">Use a base name like "PI Sprint" or include a number like "PI Sprint 5" to continue from that number.</p>
                        </div>
                        <div className="grid gap-2">
                            <label>Start Date of First Sprint</label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <label>Number of Sprints to Plan</label>
                            <Input type="number" value={sprintCount} onChange={e => setSprintCount(parseInt(e.target.value))} min={1} max={50} />
                        </div>
                        <div className="grid gap-2">
                            <label>Days duration per Sprint</label>
                            <Input type="number" value={durationWeekdayCount} onChange={e => setDurationWeekdayCount(parseInt(e.target.value))} min={1} max={260} />
                            <p className="text-xs text-muted-foreground">
                                {excludeWeekends
                                    ? 'Number of business days (Monday–Friday) per sprint. Weekends are excluded.'
                                    : 'Number of calendar days per sprint. Weekends are counted.'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                id="excludeWeekends"
                                type="checkbox"
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                checked={excludeWeekends}
                                onChange={e => setExcludeWeekends(e.target.checked)}
                            />
                            <label htmlFor="excludeWeekends" className="text-sm cursor-pointer select-none">
                                Exclude weekends
                            </label>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setStep(0)}>Cancel</Button>
                            <Button onClick={() => setStep(2)} className="w-full">Next: Strategy</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 2 && (
                <Card>
                    <CardHeader><CardTitle>2. Rotation Strategy</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div
                                onClick={() => setStrategy('sequential')}
                                className={`p-4 border rounded cursor-pointer hover:bg-accent ${strategy === 'sequential' ? 'border-primary bg-primary/10' : ''}`}
                            >
                                <h4 className="font-bold">Sequential 🔄</h4>
                                <p className="text-sm">Rotate roles in a fixed order (A&rarr;B&rarr;C).</p>
                            </div>
                            <div
                                onClick={() => setStrategy('random')}
                                className={`p-4 border rounded cursor-pointer hover:bg-accent ${strategy === 'random' ? 'border-primary bg-primary/10' : ''}`}
                            >
                                <h4 className="font-bold">Random 🎲</h4>
                                <p className="text-sm">Shuffle roles with conflict avoidance.</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                            <Button onClick={generateDrafts} className="w-full">Generate Preview</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 3 && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">3. Review Plan</h3>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                            <Button onClick={saveDrafts}><Save className="mr-2 h-4 w-4" /> Confirm & Save</Button>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        {draftSprints.map((sprint, idx) => (
                            <Card key={idx}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-muted-foreground flex justify-between">
                                        <span>{format(parseISO(sprint.start_date), 'MMM d')} - {format(parseISO(sprint.end_date), 'MMM d')}</span>
                                        <span>{sprint.name}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                        {roles.map(role => {
                                            const memberId = sprint.assignments[role.id];
                                            const member = members.find(m => m.id === memberId);
                                            return (
                                                <div key={role.id} className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${role.color.includes('bg-') ? role.color : 'bg-gray-500'}`}></div>
                                                    <span className="font-medium">{role.name}:</span>
                                                    <span>{member?.name || '-'}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

