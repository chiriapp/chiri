import { useSettingsStore } from '$hooks/useSettingsStore';
import { isMacPlatform } from '$utils/platform';

export const NotificationSettings = () => {
  const { notifications, setNotifications } = useSettingsStore();

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

        {isMacPlatform() && (
          <div className="p-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">
            <p className="text-sm text-surface-600 dark:text-surface-400">
              On macOS, you might need to allow notifications for this app when prompted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
