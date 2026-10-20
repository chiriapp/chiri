import WifiOff from 'lucide-react/icons/wifi-off';
import { LoadingSpinner } from '$components/LoadingSpinner';

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
    <div
      role="status"
      aria-live="polite"
      className={`mx-4 mt-4 flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm text-surface-700 dark:text-surface-300 ${
        isReconnecting
          ? 'border-semantic-info/30 bg-semantic-info/10'
          : 'border-semantic-warning/30 bg-semantic-warning/10'
      }`}
    >
      {isReconnecting ? (
        <>
          <LoadingSpinner className="size-4 text-semantic-info" />
          <p className="min-w-0">Reconnecting...</p>
        </>
      ) : (
        <>
          <WifiOff className="size-4 shrink-0 text-semantic-warning" />
          <p className="min-w-0">
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
