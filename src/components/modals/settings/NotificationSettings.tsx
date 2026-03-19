import { openUrl } from '@tauri-apps/plugin-opener';
import { useEffect, useState } from 'react';
import { useSettingsStore } from '$hooks/useSettingsStore';
import {
  checkNotificationPermission,
  getCachedNotificationPermission,
  type NotificationPermissionStatus,
  requestNotificationPermission,
} from '$lib/notifications';
import { isMacPlatform } from '$utils/platform';

export const NotificationSettings = () => {
  const { notifications, setNotifications } = useSettingsStore();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus | null>(
    () => {
      // Use cached value immediately if available
      return isMacPlatform() ? getCachedNotificationPermission() : null;
    },
  );
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      if (!isMacPlatform()) {
        return;
      }

      try {
        // Always check to catch any changes made in System Settings
        const result = await checkNotificationPermission();
        setPermissionStatus(result.status);
      } catch (error) {
        console.error('Failed to check notification permission:', error);
      }
    };

    checkPermission();
  }, []);

  const handleRequestPermission = async () => {
    setIsCheckingPermission(true);
    try {
      const result = await requestNotificationPermission();
      setPermissionStatus(result.status as NotificationPermissionStatus);
      console.log('Permission request result:', result);

      // If we got an error response (granted=false, status contains "error" or "operation"),
      // it means the system blocked the request - likely a cached decision
      if (!result.granted && result.status.toLowerCase().includes('error')) {
        alert(
          'The notification permission request was blocked by macOS. This usually means a previous decision was cached.\n\n' +
            'To fix this, open System Settings → Notifications, find Chiri, and toggle notifications on/off to reset the permission state.',
        );
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
      alert(
        'Failed to request notification permission. Please try opening System Settings manually.',
      );
    } finally {
      setIsCheckingPermission(false);
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
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">
        Notifications
      </h3>
      <div className="space-y-4 rounded-lg border border-surface-200 dark:border-surface-700 p-4 bg-white dark:bg-surface-800">
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <h4 className="text-sm text-surface-700 dark:text-surface-300">
                Enable notifications
              </h4>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Get notified for task reminders and due dates
              </p>
            </div>
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="rounded border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-none"
            />
          </label>
        </div>
      </div>
      {isMacPlatform() && permissionStatus !== null && (
        <div className="space-y-3 rounded-lg border border-surface-200 dark:border-surface-700 p-4 bg-white dark:bg-surface-800">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300">
                Permission Status
              </h4>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  permissionStatus === 'granted'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : permissionStatus === 'denied'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                }`}
              >
                {permissionStatus === 'granted'
                  ? 'Granted'
                  : permissionStatus === 'denied'
                    ? 'Denied'
                    : permissionStatus === 'provisional'
                      ? 'Provisional'
                      : 'Not Requested'}
              </span>
            </div>

            {permissionStatus === 'default' && (
              <p className="text-sm text-surface-600 dark:text-surface-400">
                You haven't been asked for notification permission yet. Click below to allow
                notifications.
              </p>
            )}

            {permissionStatus === 'denied' && (
              <p className="text-sm text-surface-600 dark:text-surface-400">
                Notifications are blocked. Please enable them in System Settings.
              </p>
            )}

            {permissionStatus === 'provisional' && (
              <p className="text-sm text-surface-600 dark:text-surface-400">
                Notifications are delivered quietly. You can change this in System Settings.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {permissionStatus === 'default' && (
              <button
                type="button"
                onClick={handleRequestPermission}
                disabled={isCheckingPermission}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCheckingPermission ? 'Requesting...' : 'Request Permission'}
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenSystemSettings}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              Open System Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
