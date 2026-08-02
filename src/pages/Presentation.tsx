import { useState, useEffect, useCallback, useRef } from 'react';
import { useSprintStore } from '../store/useSprintStore';
import { useUIStore } from '../store/useUIStore';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { rotateSequential, rotateRandom } from '../utils/rotation';
import { DynamicIcon } from '../components/ui/IconPicker';
import { supabase } from '../lib/supabase';
import { Loader2, Rocket } from 'lucide-react';
import type { Member, Role, Sprint, Team } from '../types';
import { ERROR_MESSAGES, getFriendlyErrorMessage } from '../utils/errors';
import { capitalizeFirst } from '../utils/string';
import html2canvas from 'html2canvas';
import { Share2, Download, Check, Copy } from 'lucide-react';

async function waitForImagesToLoad(container: HTMLElement): Promise<void> {
    const images = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
    if (images.length === 0) return;

    await Promise.all(
        images.map((img) => {
            if (img.complete && img.naturalWidth > 0) {
                return Promise.resolve();
            }

            return img.decode().catch(() => {
                if (img.complete) return;
                return new Promise<void>((resolve) => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                });
            });
        })
    );
}

export default function Presentation() {
    const { currentTeam: storeTeam, members: storeMembers, roles: storeRoles, sprints: storeSprints, startSprint } = useSprintStore();
    const { setSidebarCollapsed, presentationAnimation } = useUIStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const replayId = searchParams.get('replay');

    // Local state for public viewing
    const [publicData, setPublicData] = useState<{
        team: Team | null,
        members: Member[],
        roles: Role[],
        sprint: Sprint | null
    } | null>(null);
    const [isPublicLoading, setIsPublicLoading] = useState(!!replayId && !storeTeam);
    const [publicError, setPublicError] = useState<string | null>(null);

    // Sidebar collapse effect
    useEffect(() => {
        setSidebarCollapsed(true);
        return () => setSidebarCollapsed(false);
    }, [setSidebarCollapsed]);

    // Data orchestration: use store if logged in, otherwise use publicData
    const team = storeTeam || publicData?.team;
    const members = storeTeam ? storeMembers : (publicData?.members || []);
    const roles = storeTeam ? storeRoles : (publicData?.roles || []);
    const sprints = storeTeam ? storeSprints : (publicData?.sprint ? [publicData.sprint] : []);

    // Fetch public data if replaying without being logged in
    useEffect(() => {
        const fetchPublicData = async () => {
            if (!replayId || storeTeam) return;

            setIsPublicLoading(true);
            try {
                // 1. Fetch Sprint
                const { data: sprint, error: sErr } = await supabase
                    .from('lrn_sprints')
                    .select('*')
                    .eq('id', replayId)
                    .single();

                if (sErr || !sprint) throw new Error('Sprint not found');

                // 2. Fetch Team, Roles, and Members in parallel
                const [teamRes, rolesRes, membersRes] = await Promise.all([
                    supabase.from('lrn_teams').select('*').eq('id', sprint.team_id).single(),
                    supabase.from('lrn_roles').select('*').eq('team_id', sprint.team_id).order('created_at', { ascending: true }),
                    supabase.from('lrn_team_members').select('member_id, lrn_members(*)').eq('team_id', sprint.team_id)
                ]);

                if (teamRes.error) throw new Error('Team not found');

                const members = (membersRes.data?.map((tm: Record<string, unknown>) => tm.lrn_members).filter(Boolean) || []) as Member[];

                setPublicData({
                    team: teamRes.data,
                    members,
                    roles: rolesRes.data || [],
                    sprint
                });
            } catch (err: unknown) {
                const error = err instanceof Error ? err : new Error(String(err));
                console.error('Public fetch error:', error);
                setPublicError(getFriendlyErrorMessage(error, {
                    action: 'load this presentation',
                    fallback: ERROR_MESSAGES.presentationLoadFailed
                }));
            } finally {
                setIsPublicLoading(false);
            }
        };

        fetchPublicData();
    }, [replayId, storeTeam]);

    const hasInitialized = useRef(false);
    const [step, setStep] = useState<'loading' | 'revealing' | 'manual_setup' | 'finished'>('loading');
    const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
    const [newAssignments, setNewAssignments] = useState<Record<string, string>>({});
    const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
    const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isSnapshotMode, setIsSnapshotMode] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [avatarBlobs, setAvatarBlobs] = useState<Record<string, string>>({});
    // Ref mirror so handleCapture's onclone always reads the latest blobs (no stale closure)
    const avatarBlobsRef = useRef<Record<string, string>>({});
    const resultsRef = useRef<HTMLDivElement>(null);
    const isRocketAnimation = presentationAnimation === 'rocketship';
    const isJumpingAvatarAnimation = presentationAnimation === 'jumping-avatars';

    // Derived URLs for sharing
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseProjectId = supabaseUrl?.split('.')[0].split('//')[1];
    const edgeFunctionUrl = supabaseProjectId ? `https://${supabaseProjectId}.supabase.co/functions/v1/share-preview` : '';
    const shareProxyUrl = replayId ? `${edgeFunctionUrl}?replay=${replayId}` : '';

    // Pre-load avatars as base64 data URLs so html2canvas can render them (blob: URLs are blocked)
    useEffect(() => {
        const loadAvatars = async () => {
            const dataUrls: Record<string, string> = {};
            const promises = members.map(async (m) => {
                if (!m.avatar_url) return;
                try {
                    const response = await fetch(m.avatar_url, { mode: 'cors' });
                    if (!response.ok) return;
                    const blob = await response.blob();
                    dataUrls[m.id] = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.warn(`Could not pre-load avatar for ${m.name}, will fallback to direct URL`, e);
                }
            });
            await Promise.all(promises);
            setAvatarBlobs(dataUrls);
            avatarBlobsRef.current = dataUrls;
        };

        if (members.length > 0) {
            loadAvatars();
        }
    }, [members]);

    useEffect(() => {
        return () => {
            if (screenshotUrl) {
                URL.revokeObjectURL(screenshotUrl);
            }
        };
    }, [screenshotUrl]);

    const fireConfetti = useCallback(() => {
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#a855f7', '#ec4899']
            });
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#a855f7', '#ec4899']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();
    }, []);

    const nextReveal = useCallback(() => {
        if (currentRoleIndex < roles.length - 1) {
            setCurrentRoleIndex(prev => prev + 1);
        } else {
            setStep('finished');
            fireConfetti();

            // Only save if NOT replaying and logged in
            if (!replayId && storeTeam) {
                const startDate = new Date();
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 17);

                startSprint({
                    id: crypto.randomUUID(),
                    name: `Sprint ${sprints.length + 1}`,
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString(),
                    status: 'active',
                    assignments: newAssignments,
                    created_at: new Date().toISOString()
                });
            }
        }
    }, [currentRoleIndex, roles, fireConfetti, replayId, storeTeam, sprints, startSprint, newAssignments]);

    // Auto-play effect
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (step === 'revealing') {
            timer = setTimeout(() => {
                nextReveal();
            }, 3000);
        }
        return () => clearTimeout(timer);
    }, [step, nextReveal]);

    const handleStart = useCallback((strategy: 'random' | 'sequential' | 'manual' | 'replay') => {
        if (strategy === 'manual') {
            setStep('manual_setup');
            return;
        }

        if (strategy === 'replay' && replayId) {
            const sprint = sprints.find(s => s.id === replayId);
            if (sprint) {
                setNewAssignments(sprint.assignments);
                setStep('revealing');
                setCurrentRoleIndex(0);
                return;
            }
        }

        const lastSprint = sprints[sprints.length - 1];
        const previousAssignments = lastSprint ? lastSprint.assignments : {};

        let assignments: Record<string, string> = {};
        if (strategy === 'sequential') {
            assignments = rotateSequential(members, roles, previousAssignments);
        } else {
            assignments = rotateRandom(members, roles, previousAssignments);
        }

        setNewAssignments(assignments);
        setStep('revealing');
        setCurrentRoleIndex(0);
    }, [members, roles, sprints, replayId]);

    useEffect(() => {
        if (!hasInitialized.current && sprints.length > 0) {
            hasInitialized.current = true;
            if (replayId) {
                handleStart('replay');
            } else {
                handleStart('sequential');
            }
        }
    }, [replayId, sprints, handleStart]);

    const confirmManual = () => {
        setStep('revealing');
        setCurrentRoleIndex(0);
    };

    const handleCapture = async (): Promise<Blob | null> => {
        if (!resultsRef.current) return null;
        setIsCapturing(true);
        setUploadingImage(true);
        setIsSnapshotMode(true);
        try {
            // Double rAF: first flush React's state update to the DOM, second ensures paint.
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
            // Give framer-motion enough time to animate to the explicit resting values (duration: 0).
            await new Promise(resolve => setTimeout(resolve, 300));
            await waitForImagesToLoad(resultsRef.current);

            const canvas = await html2canvas(resultsRef.current, {
                useCORS: true,
                allowTaint: false,
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                imageTimeout: 15000,
                onclone: (_doc, clonedEl) => {
                    // 1. Strip every inline transform/opacity framer-motion injected so nothing
                    //    is off-screen, invisible, or mid-animation in the cloned DOM.
                    const allEls = Array.from(clonedEl.querySelectorAll('*')) as HTMLElement[];
                    allEls.forEach(el => {
                        if (el.style.transform) el.style.transform = 'none';
                        if (el.style.opacity !== '' && parseFloat(el.style.opacity) < 1) el.style.opacity = '1';
                        if (el.style.visibility && el.style.visibility !== 'visible') el.style.visibility = 'visible';
                    });

                    // 2. Replace every avatar <img> with a background-image <div>.
                    //    html2canvas reliably renders CSS background-image with data URLs,
                    //    but frequently drops <img> elements inside overflow:hidden + border-radius.
                    const imgs = Array.from(clonedEl.querySelectorAll('img[data-member-id]')) as HTMLImageElement[];
                    imgs.forEach(img => {
                        const memberId = img.getAttribute('data-member-id');
                        const dataUrl = memberId ? avatarBlobsRef.current[memberId] : null;
                        if (!dataUrl || !img.parentElement) return;

                        const container = img.parentElement;
                        // Open the clipping so the background image isn't cut off
                        container.style.overflow = 'visible';
                        container.style.borderRadius = '50%';

                        // Swap the <img> for a div with background-image
                        const replacement = document.createElement('div');
                        replacement.style.cssText = [
                            'width:100%',
                            'height:100%',
                            `background-image:url('${dataUrl}')`,
                            'background-size:cover',
                            'background-position:center',
                            'border-radius:50%',
                        ].join(';');
                        container.replaceChild(replacement, img);
                    });
                },
            });

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Failed to create blob');

            // 1. Local preview
            const url = URL.createObjectURL(blob);
            setScreenshotUrl(prev => {
                if (prev) URL.revokeObjectURL(prev);
                return url;
            });
            setScreenshotBlob(blob);

            // 2. Upload to Supabase Storage if replaying
            if (replayId) {
                const fileName = `sprint-${replayId}.png`;
                const { error: uploadError } = await supabase.storage
                    .from('squad-previews')
                    .upload(fileName, blob, {
                        contentType: 'image/png',
                        upsert: true
                    });

                if (uploadError) console.error('Upload error:', uploadError);
            }

            return blob;
        } catch (error) {
            console.error('Failed to capture screenshot:', error);
            return null;
        } finally {
            setIsSnapshotMode(false);
            setIsCapturing(false);
            setUploadingImage(false);
        }
    };

    const handleDownload = () => {
        if (!screenshotUrl) return;
        const link = document.createElement('a');
        link.download = `team-assemble-${team?.name || 'squad'}.png`;
        link.href = screenshotUrl;
        link.click();
    };

    const handleCopy = async () => {
        try {
            const blob = screenshotBlob || await handleCapture();
            if (!blob) return;

            if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `team-assemble-${team?.name || 'squad'}.png`;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
                return;
            }

            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (error) {
            console.error('Failed to copy image:', error);
        }
    };

    const handleShare = async () => {
        const blob = screenshotBlob || await handleCapture();
        if (!blob) return;

        const shareUrl = window.location.href; // Use current URL with replay ID if present

        // Use Web Share API if available
        if (navigator.share) {
            try {
                const file = new File([blob], 'team-assemble.png', { type: 'image/png' });

                await navigator.share({
                    title: `Team ${capitalizeFirst(team?.name)} - Sprint Presentation`,
                    text: `Check out our new team rotation for ${team?.name}!`,
                    url: shareProxyUrl || shareUrl,
                    files: [file],
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        }
    };

    // Generate meta tags for social sharing
    const baseUrl = window.location.origin + window.location.pathname.replace('/presentation', '');
    const currentUrl = window.location.href;
    const pageTitle = team ? `Team ${capitalizeFirst(team.name)} - Sprint Presentation` : 'Team Assemble - Sprint Presentation';
    const pageDescription = team && roles.length > 0
        ? `Check out the sprint roles for Team ${capitalizeFirst(team.name)}: ${roles.slice(0, 3).map(r => r.name).join(', ')}${roles.length > 3 ? '...' : ''}`
        : 'Sprint role assignments and rotations for agile teams';

    // Use screenshot URL if available, otherwise fallback to default
    const ogImageUrl = screenshotUrl || `${baseUrl}/social-preview.png`;

    if (isPublicLoading || step === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Preparing presentation...</p>
            </div>
        );
    }

    if (publicError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-6 text-center px-4">
                <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 text-2xl">⚠️</div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Presentation Not Found</h2>
                    <p className="text-muted-foreground max-w-md">{publicError}</p>
                </div>
                <Button onClick={() => navigate('/')}>Return to Home</Button>
            </div>
        );
    }



    if (step === 'manual_setup') {
        return (
            <div className="max-w-2xl mx-auto space-y-6 p-4 pt-12">
                <h2 className="text-3xl font-bold text-center">Manual Assignments</h2>
                <div className="space-y-4">
                    {roles.map(role => (
                        <Card key={role.id}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <span className="font-semibold">{role.name}</span>
                                <select
                                    className="p-2 rounded border bg-background"
                                    value={newAssignments[role.id] || ''}
                                    onChange={(e) => setNewAssignments(prev => ({ ...prev, [role.id]: e.target.value }))}
                                >
                                    <option value="">Select Member...</option>
                                    {members.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Button onClick={confirmManual} className="w-full" size="lg">
                    Start Reveal Presentation 🚀
                </Button>
            </div>
        )
    }

    const currentRole = roles[currentRoleIndex];
    if (!currentRole) return null;

    const assignedMemberId = newAssignments[currentRole.id];
    const assignedMember = members.find(m => m.id === assignedMemberId);
    const revealContainerInitial = isRocketAnimation
        ? { opacity: 0, scale: 0.4, y: 220, rotate: -8 }
        : { opacity: 0, scale: 0.6, y: 50 };
    const revealContainerAnimate = isRocketAnimation
        ? { opacity: 1, scale: 1, y: 0, rotate: 0 }
        : { opacity: 1, scale: 1, y: 0 };
    const revealContainerExit = isRocketAnimation
        ? { opacity: 0, scale: 0.9, y: -180, rotate: 6 }
        : { opacity: 0, scale: 0.8, y: -50 };
    const avatarJumpAnimation = isJumpingAvatarAnimation
        ? { y: [0, -24, 0, -12, 0], scale: [1, 1.04, 1, 1.02, 1] }
        : { y: [0, -10, 0] };
    const avatarJumpTransition = isJumpingAvatarAnimation
        ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' as const }
        : { duration: 3, repeat: Infinity, ease: 'easeInOut' as const };

    return (
        <div className="flex flex-col items-center justify-center min-h-[100vh] space-y-6 p-4">
            <title>{pageTitle}</title>
            <meta name="description" content={pageDescription} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={pageDescription} />
            <meta property="og:image" content={ogImageUrl} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={currentUrl} />
            <meta property="twitter:title" content={pageTitle} />
            <meta property="twitter:description" content={pageDescription} />
            <meta property="twitter:image" content={ogImageUrl} />

            {step === 'finished' ? (
                <div className="text-center space-y-6 animate-in zoom-in duration-1000 w-full flex flex-col items-center justify-center">
                    <div ref={resultsRef} className="p-8 pb-12 w-full flex flex-col items-center justify-center bg-background rounded-3xl">
                        <h2 className="text-4xl md:text-5xl font-bold mb-12 italic tracking-tighter">Team {capitalizeFirst(team?.name)}... <span className="text-primary uppercase">assemble!</span> 🚀</h2>
                        <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 max-w-6xl">
                            {roles.map((role, index) => {
                                const mId = newAssignments[role.id];
                                const m = members.find(mem => mem.id === mId);
                                return (
                                    <motion.div
                                        key={role.id}
                                        initial={isSnapshotMode ? false : isRocketAnimation ? { opacity: 0, scale: 0.65, y: 80 } : { opacity: 0, scale: 0.5, y: 20 }}
                                        animate={isRocketAnimation ? { opacity: 1, scale: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                                        transition={isSnapshotMode ? { duration: 0 } : isRocketAnimation ? { duration: 0.75, delay: index * 0.12, ease: 'easeOut' } : { duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
                                        whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                                    >
                                        <Card className="border-primary/20 bg-primary/5 overflow-visible relative mt-4 hover:shadow-xl hover:border-primary/50 transition-all duration-300">
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-background p-2 rounded-full border shadow-sm">
                                                <DynamicIcon name={role.icon || 'Shield'} className={`h-8 w-8 ${role.color?.replace('bg-', 'text-') || 'text-primary'}`} />
                                            </div>
                                            <CardContent className="pt-8 pb-4 px-4 flex flex-col items-center">
                                                <div className="text-xs font-bold uppercase tracking-widest text-primary mb-3 mt-2">{role.name}</div>
                                                {m ? (
                                                    <motion.div
                                                        className="flex flex-col items-center gap-2"
                                                        initial={isSnapshotMode ? false : isRocketAnimation ? { scale: 0.6, y: 36, opacity: 0 } : { scale: 0 }}
                                                        animate={isRocketAnimation ? { scale: 1, y: 0, opacity: 1 } : { scale: 1 }}
                                                        transition={isSnapshotMode ? { duration: 0 } : isRocketAnimation ? { duration: 0.55, delay: index * 0.1 + 0.2 } : { duration: 0.4, delay: index * 0.1 + 0.2 }}
                                                    >
                                                        <motion.div
                                                            className="h-14 w-14 md:h-16 md:w-16 rounded-full overflow-hidden bg-secondary border-2 border-primary/20 ring-2 ring-primary/0 hover:ring-primary/50 transition-all"
                                                            animate={isSnapshotMode ? { y: 0, scale: 1 } : avatarJumpAnimation}
                                                            transition={isSnapshotMode ? { duration: 0 } : avatarJumpTransition}
                                                            whileHover={{ boxShadow: "0 0 20px rgba(168, 85, 247, 0.4)" }}
                                                        >
                                                            {m.avatar_url ? (
                                                                <img
                                                                    src={avatarBlobs[m.id] || m.avatar_url}
                                                                    data-member-id={m.id}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="h-full w-full flex items-center justify-center font-bold text-xl text-muted-foreground">
                                                                    {m.name.charAt(0)}
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                        <div className="font-semibold text-base md:text-lg truncate w-full text-center">{m.name}</div>
                                                    </motion.div>
                                                ) : <span className="text-muted-foreground">-</span>}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-6 pt-12">
                        <div className="flex flex-wrap justify-center gap-3">
                            {!screenshotUrl ? (
                                <Button
                                    onClick={handleCapture}
                                    size="lg"
                                    variant="outline"
                                    className="gap-2 border-primary/20 hover:bg-primary/5"
                                    disabled={isCapturing}
                                >
                                    {isCapturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                                    {isCapturing ? 'Generating Preview...' : 'Prepare to Share'}
                                </Button>
                            ) : (
                                <>
                                    <Button onClick={handleDownload} size="lg" variant="outline" className="gap-2 border-primary/20" disabled={uploadingImage}>
                                        <Download className="h-4 w-4" />
                                        Download Image
                                    </Button>
                                    <Button onClick={handleCopy} size="lg" variant="outline" className="gap-2 border-primary/20 min-w-[140px]" disabled={uploadingImage}>
                                        {copySuccess ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        {copySuccess ? 'Copied!' : 'Copy Image'}
                                    </Button>
                                    {typeof navigator.share === 'function' && (
                                        <Button onClick={handleShare} size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700" disabled={uploadingImage}>
                                            <Share2 className="h-4 w-4" />
                                            Share Results
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Share URL Button - Always visible when there's a replayId */}
                        {replayId && (
                            <div className="flex flex-col items-center gap-2">
                                <p className="text-sm text-muted-foreground">{uploadingImage ? 'Syncing preview for social media...' : ''}</p>
                            </div>
                        )}

                        {storeTeam ? (
                            <Button onClick={() => navigate('/')} size="lg" className="min-w-[200px]" variant="ghost">
                                Back to Dashboard
                            </Button>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-muted-foreground">Inspired by this team? Create your own!</p>
                                <Button onClick={() => navigate('/')} size="lg" className="min-w-[250px] bg-gradient-to-r from-primary to-purple-600 border-none shadow-lg hover:shadow-primary/20 transition-all">
                                    Join Team Assemble now.
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentRole.id}
                        initial={revealContainerInitial}
                        animate={revealContainerAnimate}
                        exit={revealContainerExit}
                        transition={isRocketAnimation ? { duration: 1.5, ease: 'easeOut' } : { duration: 2, ease: 'easeInOut' }}
                        className="w-full max-w-2xl text-center flex flex-col items-center justify-center"
                    >
                        <h3 className="text-5xl md:text-6xl font-extrabold mb-12 text-primary">
                            {currentRole.name}
                        </h3>

                        <motion.div
                            className="bg-card p-12 rounded-3xl border-2 border-primary/30 shadow-2xl mb-8 w-full max-w-lg min-h-[350px] flex flex-col items-center justify-center relative overflow-hidden group hover:border-primary/60 transition-all"
                            whileHover={{ boxShadow: "0 0 40px rgba(168, 85, 247, 0.3)" }}
                        >
                            <motion.div
                                className="absolute inset-0 opacity-5 flex items-center justify-center pointer-events-none"
                                animate={isRocketAnimation ? { y: [120, -200], opacity: [0, 0.12, 0] } : { rotate: 360 }}
                                transition={isRocketAnimation ? { duration: 2.2, repeat: Infinity, ease: 'easeOut' } : { duration: 20, repeat: Infinity, ease: 'linear' }}
                            >
                                {isRocketAnimation ? (
                                    <Rocket className="h-40 w-40" />
                                ) : (
                                    <DynamicIcon name={currentRole.icon || 'Shield'} className="h-48 w-48" />
                                )}
                            </motion.div>

                            {assignedMember ? (
                                <motion.div
                                    className="z-10 flex flex-col items-center gap-4"
                                    initial={isRocketAnimation ? { scale: 0.6, opacity: 0, y: 60 } : { scale: 0, opacity: 0 }}
                                    animate={isRocketAnimation ? { scale: 1, opacity: 1, y: 0 } : { scale: 1, opacity: 1 }}
                                    transition={isRocketAnimation ? { duration: 1.1, ease: 'easeOut' } : { duration: 1.5, ease: 'easeOut' }}
                                >
                                    <motion.div
                                        className="relative h-40 w-40 rounded-full overflow-hidden bg-secondary mb-2 border-4 border-primary shadow-2xl ring-4 ring-primary/20"
                                        animate={avatarJumpAnimation}
                                        transition={avatarJumpTransition}
                                        whileHover={{ scale: 1.1, boxShadow: "0 0 30px rgba(168, 85, 247, 0.6)" }}
                                    >
                                        {assignedMember.avatar_url ? (
                                            <img
                                                src={avatarBlobs[assignedMember.id] || assignedMember.avatar_url}
                                                data-member-id={assignedMember.id}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center font-bold text-5xl text-muted-foreground">
                                                {assignedMember.name.charAt(0)}
                                            </div>
                                        )}
                                    </motion.div>
                                    <motion.div
                                        className="text-5xl font-bold tracking-tight text-center"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 1, delay: 0.3 }}
                                    >
                                        {assignedMember.name}
                                    </motion.div>
                                </motion.div>
                            ) : (
                                <div className="text-2xl text-muted-foreground italic z-10">No assignment</div>
                            )}
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
}
