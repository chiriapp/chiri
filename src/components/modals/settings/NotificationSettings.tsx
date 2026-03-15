import { openUrl } from '@tauri-apps/plugin-opener';
import { useSettingsStore } from '$hooks/useSettingsStore';
import { isMacPlatform } from '$utils/platform';

export const NotificationSettings = () => {
  const { notifications, setNotifications } = useSettingsStore();

  const handleOpenSystemSettings = async () => {
    try {
      await openUrl(
        'x-apple.systempreferences:com.apple.preference.notifications?id=moe.sapphic.chiri',
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
      {isMacPlatform() && (
        <div className="space-y-3 rounded-lg border border-surface-200 dark:border-surface-700 p-4 bg-white dark:bg-surface-800">
          <p className="text-sm text-surface-600 dark:text-surface-400">
            On macOS, you might need to allow notifications for this app when prompted.
          </p>
          <button
            type="button"
            onClick={handleOpenSystemSettings}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            Open System Settings
          </button>
        </div>
      )}
    </div>
  );
};
