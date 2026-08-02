import { useSprintStore } from '../../store/useSprintStore';
import { WifiOff, AlertTriangle } from 'lucide-react';

export function OfflineBanner() {
    const { isOffline, isUsingSampleData } = useSprintStore();

    if (!isOffline && !isUsingSampleData) return null;

    return (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium animate-in slide-in-from-top duration-300">
            {isOffline ? (
                <>
                    <WifiOff className="h-4 w-4" />
                    <span>You are offline. Changes are saved locally but won't sync to the cloud.</span>
                </>
            ) : isUsingSampleData ? (
                <>
                    <AlertTriangle className="h-4 w-4" />
                    <span>Using sample data for testing purposes. Connect to the database to see your real data.</span>
                </>
            ) : null}
        </div>
    );
}
