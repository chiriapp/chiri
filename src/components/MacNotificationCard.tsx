import { openUrl } from '@tauri-apps/plugin-opener';
import Info from 'lucide-react/icons/info';
import type {
  NotificationAlertStyle,
  NotificationPermissionResult,
  NotificationPermissionStatus,
} from '$types/notifications/permission';

interface MacNotificationCardProps {
  permissionStatus: NotificationPermissionStatus;
  isCheckingPermission: boolean;
  requestPermission: () => Promise<NotificationPermissionResult>;
  alertStyle?: NotificationAlertStyle | null;
  density?: 'default' | 'compact';
}

export const MacNotificationCard = ({
  permissionStatus,
  isCheckingPermission,
  requestPermission,
  alertStyle = null,
  density = 'default',
}: MacNotificationCardProps) => {
  const isCompact = density === 'compact';

  const permissionDotClass =
    permissionStatus === 'granted'
      ? 'bg-semantic-success'
      : permissionStatus === 'denied'
        ? 'bg-semantic-error'
        : 'bg-semantic-warning';

  const permissionLabelClass =
    permissionStatus === 'granted'
      ? 'text-semantic-success'
      : permissionStatus === 'denied'
        ? 'text-semantic-error'
        : 'text-semantic-warning';

  const permissionLabel =
    permissionStatus === 'granted'
      ? 'Granted'
      : permissionStatus === 'denied'
        ? 'Denied'
        : permissionStatus === 'provisional'
          ? 'Provisional'
          : 'Not requested';

  const permissionDescription =
    permissionStatus === 'default'
      ? "Permission hasn't been requested yet."
      : permissionStatus === 'denied'
        ? 'Notifications are blocked. Enable them in System Settings.'
        : permissionStatus === 'provisional'
          ? 'Notifications are delivered quietly.'
          : null;

  const handleRequestPermission = async () => {
    try {
      const result = await requestPermission();

      // a granted=false result whose status string contains "error" means macOS
      // silently blocked the dialog due to a cached decision
      if (!result.granted && result.status.toLowerCase().includes('error')) {
        alert(
          'The notification permission request was blocked by macOS. This usually means a previous decision was cached.\n\n' +
            'To fix this, open System Settings -> Notifications, find Chiri, and toggle notifications on/off to reset the permission state.',
        );
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
      alert(
        'Failed to request notification permission. Please try opening System Settings manually.',
      );
    }
  };

  const handleOpenSystemSettings = async () => {
    try {
      await openUrl(
        'x-apple.systempreferences:com.apple.preference.notifications?id=garden.chiri.Chiri',
      );
    } catch (error) {
      console.error('Failed to open system settings:', error);
    }
  };

  const permissionHeader = (
    <div className={`flex items-center justify-between ${isCompact ? 'p-3' : 'p-4'}`}>
      <div>
        <p className="text-sm text-surface-700 dark:text-surface-300">
          macOS notification permission
        </p>
        {permissionDescription && (
          <p className="mt-0.5 text-surface-500 text-xs dark:text-surface-400">
            {permissionDescription}
          </p>
        )}
      </div>
      <span className={`flex shrink-0 items-center gap-1.5 text-xs ${permissionLabelClass}`}>
        <span className={`size-2 rounded-full ${permissionDotClass}`} />
        {permissionLabel}
      </span>
    </div>
  );

  const openSystemSettingsButton = (
    <button
      type="button"
      onClick={handleOpenSystemSettings}
      className="flex items-center gap-2 rounded-lg border border-surface-300 bg-surface-100 px-3 py-1.5 text-sm text-surface-800 outline-hidden transition-colors hover:border-surface-400 hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:border-surface-600 dark:bg-surface-700 dark:text-surface-200 dark:hover:border-surface-500 dark:hover:bg-surface-600"
    >
      Open macOS Settings
    </button>
  );

  const isTemporaryBanner = permissionStatus === 'granted' && alertStyle === 'banner';

  return (
    <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
      {permissionHeader}

      {isTemporaryBanner && (
        <div
          className={`${isCompact ? 'mx-3' : 'mx-4'} ${isCompact ? 'mt-1' : ''} mb-4 flex items-start gap-2 rounded-lg border border-semantic-info/30 bg-semantic-info/10 p-3 text-surface-700 text-xs dark:text-surface-300`}
        >
          <Info className="mt-0.5 size-3.5 shrink-0 text-semantic-info" aria-hidden="true" />
          <p>
            Tip: Chiri's macOS alert style is set to Temporary. For task reminders, consider
            choosing <span className="font-medium">Persistent</span> so they stay visible until
            dismissed.
          </p>
        </div>
      )}

      <div
        className={`flex gap-2 border-surface-200 border-t dark:border-surface-700 ${isCompact ? 'px-3 pt-2 pb-3' : 'px-4 py-3'}`}
      >
        {permissionStatus === 'default' && (
          <button
            type="button"
            onClick={handleRequestPermission}
            disabled={isCheckingPermission}
            className="flex items-center gap-2 rounded-lg bg-primary-500 px-3 py-1.5 text-primary-contrast text-sm outline-hidden transition-colors hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-surface-800"
          >
            {isCheckingPermission ? 'Waiting for permission...' : 'Request permission'}
          </button>
        )}

        {openSystemSettingsButton}
      </div>
    </div>
  );
};
