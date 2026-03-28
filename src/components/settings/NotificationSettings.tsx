import { AppSelect } from '$components/AppSelect';
import { MacNotificationPermissionCard } from '$components/MacNotificationPermissionCard';
import { useNotificationContext } from '$hooks/useNotificationContext';
import { useSettingsStore } from '$hooks/useSettingsStore';
import { isMacPlatform } from '$utils/platform';

const formatHour = (hour: number, use24h: boolean) => {
  if (use24h) return `${String(hour).padStart(2, '0')}:00`;
  if (hour === 0) return '12:00 AM';
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return '12:00 PM';
  return `${hour - 12}:00 PM`;
};

export const NotificationSettings = () => {
  const {
    notifications,
    setNotifications,
    notifyReminders,
    setNotifyReminders,
    notifyOverdue,
    setNotifyOverdue,
    enableToasts,
    setEnableToasts,
    quietHoursEnabled,
    setQuietHoursEnabled,
    quietHoursStart,
    setQuietHoursStart,
    quietHoursEnd,
    setQuietHoursEnd,
    defaultAllDayReminderHour,
    setDefaultAllDayReminderHour,
    timeFormat,
  } = useSettingsStore();

  const use24h = timeFormat === '24';
  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: formatHour(i, use24h),
  }));
  const { permissionStatus, isCheckingPermission, requestPermission } = useNotificationContext();

  // on macOS the toggle is gated behind OS permission
  // must be granted or provisional before the user can enable/disable it in-app
  const macPermissionPending =
    isMacPlatform() &&
    permissionStatus !== null &&
    permissionStatus !== 'granted' &&
    permissionStatus !== 'provisional';

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">
        Notifications
      </h3>

      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <label
          className={`flex items-center justify-between p-4 ${macPermissionPending ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Enable notifications</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Get notified for task reminders and overdue tasks
            </p>
            {macPermissionPending && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Notification permission is required, use the controls below to grant it.
              </p>
            )}
          </div>
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
            disabled={macPermissionPending}
            className="rounded border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-none disabled:cursor-not-allowed"
          />
        </label>

        {notifications && (
          <div className="px-4 pb-4">
            <div className="space-y-3 pl-4 border-l-2 border-surface-200 dark:border-surface-600">
              <label
                className={`flex items-center justify-between ${macPermissionPending ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div>
                  <p className="text-sm text-surface-700 dark:text-surface-300">Reminders</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    Notify when a task reminder is due
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyReminders}
                  onChange={(e) => setNotifyReminders(e.target.checked)}
                  disabled={macPermissionPending}
                  className="rounded border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-none disabled:cursor-not-allowed"
                />
              </label>
              <label
                className={`flex items-center justify-between ${macPermissionPending ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div>
                  <p className="text-sm text-surface-700 dark:text-surface-300">Overdue tasks</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    Notify when a task's due date has passed
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyOverdue}
                  onChange={(e) => setNotifyOverdue(e.target.checked)}
                  disabled={macPermissionPending}
                  className="rounded border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-none disabled:cursor-not-allowed"
                />
              </label>
            </div>
          </div>
        )}

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Enable toasts</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Show brief pop-up messages for sync status and errors
            </p>
          </div>
          <input
            type="checkbox"
            checked={enableToasts}
            onChange={(e) => setEnableToasts(e.target.checked)}
            className="rounded border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-none"
          />
        </label>
      </div>

      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Quiet hours</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Suppress all notifications during a set time window
            </p>
          </div>
          <input
            type="checkbox"
            checked={quietHoursEnabled}
            onChange={(e) => setQuietHoursEnabled(e.target.checked)}
            className="rounded border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-none"
          />
        </label>

        {quietHoursEnabled && (
          <div className="px-4 pb-4">
            <div className="space-y-3 pl-4 border-l-2 border-surface-200 dark:border-surface-600">
              <div className="flex items-center justify-between">
                <p className="text-sm text-surface-600 dark:text-surface-400">From</p>
                <AppSelect
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(Number(e.target.value))}
                  className="text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg py-1 outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors shrink-0"
                >
                  {hourOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </AppSelect>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-surface-600 dark:text-surface-400">Until</p>
                <AppSelect
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(Number(e.target.value))}
                  className="text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg py-1 outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors shrink-0"
                >
                  {hourOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </AppSelect>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">All-day reminder time</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Time used when a task has no specific time set
            </p>
          </div>
          <AppSelect
            value={defaultAllDayReminderHour}
            onChange={(e) => setDefaultAllDayReminderHour(Number(e.target.value))}
            className="text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg py-1 outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors shrink-0"
          >
            {hourOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </AppSelect>
        </div>
      </div>

      {isMacPlatform() && permissionStatus !== null && (
        <MacNotificationPermissionCard
          permissionStatus={permissionStatus}
          isCheckingPermission={isCheckingPermission}
          requestPermission={requestPermission}
        />
      )}
    </div>
  );
};
