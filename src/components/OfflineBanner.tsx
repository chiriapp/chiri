import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  isOffline: boolean;
  syncOnReconnect: boolean;
}

export const OfflineBanner = ({ isOffline, syncOnReconnect }: OfflineBannerProps) => {
  if (!isOffline) {
    return null;
  }

  return (
    <div className="flex flex-row items-center text-center justify-center gap-2 p-1.5 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300">
      <WifiOff className="w-5 h-5" />
      <p>
        You're offline.
        {syncOnReconnect
          ? ' Changes will sync when you reconnect.'
          : ' Use the sync button to sync when you reconnect.'}
      </p>
    </div>
  );
};
