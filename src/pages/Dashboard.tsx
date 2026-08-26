import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useSprintStore } from '../store/useSprintStore';
import { useUIStore, type PresentationAnimation } from '../store/useUIStore';
import { capitalizeFirst } from '../utils/string';
import { Calendar, Play, Users, Shield, Sparkles, Info, Copy, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const animationOptions: Array<{
    value: PresentationAnimation;
    label: string;
    description: string;
}> = [
    {
        value: 'graffiti',
        label: 'Simple Graffiti',
        description: 'Clean reveal with the current signature look.',
    },
    {
        value: 'rocketship',
        label: 'Rocketship Launch',
        description: 'Launch-style motion with a dramatic takeoff feel.',
    },
    {
        value: 'jumping-avatars',
        label: 'Jumping Avatars',
        description: 'Members bounce into view with more playful energy.',
    },
];

export default function Dashboard() {
    const { currentTeam, members, roles, sprints, currentSprintId, logout } = useSprintStore();
    const { presentationAnimation, setPresentationAnimation } = useUIStore();
    const navigate = useNavigate();
    const [copiedTeamId, setCopiedTeamId] = useState(false);
    const [copiedReplaySprintId, setCopiedReplaySprintId] = useState<string | null>(null);

    const activeSprints = sprints.filter((sprint) => sprint.status === 'active');
    const currentActiveSprint =
        (currentSprintId ? activeSprints.find((sprint) => sprint.id === currentSprintId) : undefined)
        ?? activeSprints.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())[0];

    const copyTeamId = async () => {
        const teamId = currentTeam?.id;
        if (!teamId) return;
        try {
            await navigator.clipboard.writeText(teamId);
            setCopiedTeamId(true);
            setTimeout(() => setCopiedTeamId(false), 2000);
        } catch {
            alert(teamId);
        }
    };

    const copySlackShare = async (sprintId: string) => {
        const appBase = `${window.location.origin}/team-assemble`;
        const replayUrl = `${appBase}/presentation?replay=${sprintId}`;
        const serverBase = import.meta.env.VITE_SERVER_BASE_URL?.replace(/\/$/, '');
        const shareUrl = serverBase && currentTeam?.id
            ? `${serverBase}/share?team=${encodeURIComponent(currentTeam.id)}&app=${encodeURIComponent(appBase)}&v=${encodeURIComponent(sprintId)}`
            : replayUrl;

        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopiedReplaySprintId(sprintId);
            setTimeout(() => setCopiedReplaySprintId(null), 2000);
        } catch {
            alert(shareUrl);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-4xl font-extrabold tracking-tight text-primary">
                        {capitalizeFirst(currentTeam?.name)}
                    </h2>
                    <p className="text-muted-foreground font-medium flex items-center gap-2 mt-1">
                        Dashboard & Sprint Overview
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => logout()}>
                        Switch Team
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Team Size</CardTitle>
                        <div className="h-4 w-4 text-muted-foreground">👥</div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{members.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Roles</CardTitle>
                        <div className="h-4 w-4 text-muted-foreground">🎭</div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{roles.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Active Sprint Assignments */}
            {currentActiveSprint ? (
                (() => {
                    const activeSprint = currentActiveSprint;
                    return (
                    // ... (existing active sprint card)
                    <Card key={activeSprint.id} className="border-primary/20 bg-primary/5">
                        <CardHeader>
                            <div className="space-y-3">
                                <CardTitle className="flex justify-between items-center flex-wrap gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span>{activeSprint.name}</span>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => navigate(`/presentation?replay=${activeSprint.id}`)}
                                                title="Replay Presentation"
                                            >
                                                <Play className="h-4 w-4 text-primary" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => copySlackShare(activeSprint.id)}
                                                title="Copy Slack Share Text"
                                            >
                                                {copiedReplaySprintId === activeSprint.id ? (
                                                    <Copy className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <Share2 className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-2 rounded-xl border border-border bg-background/80 px-3 py-1.5">
                                            <Sparkles className="h-4 w-4 text-primary" />
                                            <select
                                                className="bg-transparent text-sm outline-none"
                                                value={presentationAnimation}
                                                onChange={(e) => setPresentationAnimation(e.target.value as PresentationAnimation)}
                                                aria-label="Presentation animation"
                                            >
                                                {animationOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="group relative">
                                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                                <div className="absolute left-1/2 top-6 z-20 hidden w-72 -translate-x-1/2 rounded-xl border bg-popover p-3 text-left text-xs text-muted-foreground shadow-xl group-hover:block">
                                                    <p className="font-semibold text-foreground mb-2">Presentation animations</p>
                                                    <div className="space-y-2">
                                                        {animationOptions.map((option) => (
                                                            <div key={option.value}>
                                                                <span className="font-medium text-foreground">{option.label}</span>
                                                                <p>{option.description}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => navigate('/planning')}>
                                        Edit Plan
                                    </Button>
                                </CardTitle>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>{new Date(activeSprint.start_date).toLocaleDateString()}</span>
                                    </div>
                                    <span>→</span>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>{new Date(activeSprint.end_date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {roles.map(role => {
                                    const memberId = activeSprint.assignments[role.id];
                                    const member = members.find(m => m.id === memberId);

                                    return (
                                        <Card key={role.id} className="overflow-hidden border-2 hover:border-primary/50 transition-colors">
                                            <div className={`h-2 w-full ${role.color.includes('bg-') ? role.color : 'bg-gray-500'}`} />
                                            <CardContent className="p-4 flex items-center gap-4">
                                                <div className="relative h-14 w-14 rounded-full overflow-hidden bg-secondary flex-shrink-0 border-2 border-background shadow-sm">
                                                    {member?.avatar_url ? (
                                                        <img src={member.avatar_url} alt={member.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground font-bold text-xl">
                                                            {(member?.name || '?').charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-lg leading-tight">{member?.name || 'Unassigned'}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`inline-block w-2 h-2 rounded-full ${role.color.includes('bg-') ? role.color : 'bg-gray-500'}`} />
                                                        <p className="text-sm text-muted-foreground font-medium">{role.name}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                    );
                })()
            ) : members.length === 0 || roles.length === 0 ? (
                <Card className="border-dashed">
                    <CardHeader>
                        <CardTitle>Setup Required</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-12 space-y-6 max-w-md mx-auto">
                            <div className="flex justify-center gap-4">
                                <div className={`p-4 rounded-full ${members.length === 0 ? 'bg-secondary text-muted-foreground' : 'bg-primary/20 text-primary'}`}>
                                    <Users className="h-8 w-8" />
                                </div>
                                <div className={`p-4 rounded-full ${roles.length === 0 ? 'bg-secondary text-muted-foreground' : 'bg-primary/20 text-primary'}`}>
                                    <Shield className="h-8 w-8" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold">Ready to Rotate?</h3>
                                <p className="text-muted-foreground mt-2">
                                    You need at least one **Member** and one **Role** to start planning rotations.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3">
                                {members.length === 0 && (
                                    <Button variant="outline" onClick={() => navigate('/squad')} className="w-full justify-start px-8">
                                        Step 1. Add Squad Members 👥
                                    </Button>
                                )}
                                {roles.length === 0 && (
                                    <Button variant="outline" onClick={() => navigate('/roles')} className="w-full justify-start px-8">
                                        Step 2. Define Roles 🛡️
                                    </Button>
                                )}
                                {members.length > 0 && roles.length > 0 && (
                                    <Button variant="default" onClick={() => navigate('/planning')} className="w-full bg-green-600 hover:bg-green-700 justify-start px-8">
                                        Step 3. Start Planning Sprints 🗓️
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Current Assignments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-4">
                            <div className="p-4 rounded-full bg-secondary">
                                <Calendar className="h-8 w-8 opacity-50" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">No Active Sprint</h3>
                                <p>Start a new rotation to see assignments here.</p>
                            </div>
                            <Button onClick={() => navigate('/planning')}>
                                Go to Planner
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={copyTeamId} className="gap-2" disabled={!currentTeam?.id}>
                    <Copy className="h-4 w-4" />
                    {copiedTeamId ? 'Team id copied' : 'Copy team-id'}
                </Button>
            </div>
        </div>
    );
}
