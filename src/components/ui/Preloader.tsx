import { useSprintStore } from '../../store/useSprintStore';
import { Loader2, Cloud } from 'lucide-react';

export function Preloader() {
    const { isLoading, isOffline } = useSprintStore();

    // Do not show preloader if offline as per user request
    if (!isLoading || isOffline) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-500">
            <div className="relative">
                {/* Outer spin */}
                <div className="h-24 w-24 rounded-full border-t-2 border-primary animate-spin" />
                {/* Inner icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <Cloud className="h-8 w-8 text-primary animate-pulse" />
                </div>
            </div>

            <div className="mt-8 text-center space-y-2">
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
                    Syncing with Cloud
                </h3>
                <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium tracking-wide uppercase">Securing session...</span>
                </div>
            </div>

            {/* Hint for blocked UI */}
            <p className="fixed bottom-8 text-[10px] uppercase tracking-widest text-muted-foreground opacity-50">
                Interface disabled until sync completes
            </p>
        </div>
    );
}
