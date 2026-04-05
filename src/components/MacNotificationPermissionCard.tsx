import { openUrl } from '@tauri-apps/plugin-opener';
import type {
  NotificationPermissionResult,
  NotificationPermissionStatus,
} from '$lib/notifications';

interface MacNotificationPermissionCardProps {
  permissionStatus: NotificationPermissionStatus;
  isCheckingPermission: boolean;
  requestPermission: () => Promise<NotificationPermissionResult>;
  density?: 'default' | 'compact';
}

export const MacNotificationPermissionCard = ({
  permissionStatus,
  isCheckingPermission,
  requestPermission,
  density = 'default',
}: MacNotificationPermissionCardProps) => {
  const isCompact = density === 'compact';

  const permissionBadgeClass =
    permissionStatus === 'granted'
      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      : permissionStatus === 'denied'
        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';

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

      // A granted=false result whose status string contains "error" means macOS
      // silently blocked the dialog due to a cached decision.
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
        'x-apple.systempreferences:com.apple.preference.notifications?id=moe.sapphic.Chiri',
      );
    } catch (error) {
      console.error('Failed to open system settings:', error);
    }
  };

  return (
    <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
      <div className={`flex items-center justify-between ${isCompact ? 'p-3' : 'p-4'}`}>
        <div>
          <p className="text-sm text-surface-700 dark:text-surface-300">
            macOS notification permission
          </p>
          {permissionDescription && (
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
              {permissionDescription}
            </p>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded-lg shrink-0 ${permissionBadgeClass}`}>
          {permissionLabel}
        </span>
      </div>

      <div className="border-t border-surface-200 dark:border-surface-700" />

      <div className={`flex gap-2 ${isCompact ? 'px-3 pt-2 pb-3' : 'px-4 py-3'}`}>
        {permissionStatus === 'default' && (
          <button
            type="button"
            onClick={handleRequestPermission}
            disabled={isCheckingPermission}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-primary-contrast rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCheckingPermission ? 'Requesting...' : 'Request permission'}
          </button>
        )}

        <button
          type="button"
          onClick={handleOpenSystemSettings}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
        >
          Open macOS Settings
        </button>
      </div>
    </div>
  );
};
