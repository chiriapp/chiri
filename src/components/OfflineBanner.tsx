import Loader2 from 'lucide-react/icons/loader-2';
import WifiOff from 'lucide-react/icons/wifi-off';

interface OfflineBannerProps {
  isOffline: boolean;
  isReconnecting: boolean;
  syncOnReconnect: boolean;
}

export const OfflineBanner = ({
  isOffline,
  isReconnecting,
  syncOnReconnect,
}: OfflineBannerProps) => {
  if (!isOffline && !isReconnecting) {
    return null;
  }

  return (
    <div className="flex flex-row items-center justify-center gap-2 border border-surface-200 bg-surface-100 p-1.5 text-center text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300">
      {isReconnecting ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <p>Reconnecting...</p>
        </>
      ) : (
        <>
          <WifiOff className="h-5 w-5" />
          <p>
            You're offline.
            {syncOnReconnect
              ? ' Changes will sync when you reconnect.'
              : ' Use the sync button to sync when you reconnect.'}
          </p>
        </>
      )}
    </div>
  );
};
