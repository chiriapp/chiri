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
    <div className="flex flex-row items-center text-center justify-center gap-2 p-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
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
