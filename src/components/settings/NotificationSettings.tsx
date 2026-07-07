import { useState } from 'react';
import { MacNotificationCard } from '$components/MacNotificationCard';
import { TimePickerModal } from '$components/modals/TimePickerModal';
import { useNotificationContext } from '$context/notificationContext';
import { useSettingsStore } from '$context/settingsContext';
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
    showAppIconBadge,
    setShowAppIconBadge,
    quietHoursEnabled,
    setQuietHoursEnabled,
    quietHoursStart,
    setQuietHoursStart,
    quietHoursEnd,
    setQuietHoursEnd,
    timeFormat,
  } = useSettingsStore();

  const [quietHoursStartModalOpen, setQuietHoursStartModalOpen] = useState(false);
  const [quietHoursEndModalOpen, setQuietHoursEndModalOpen] = useState(false);

  const use24h = timeFormat === '24';
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
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">
        Notifications
      </h3>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="p-4">
          <label
            className={`flex items-center justify-between ${macPermissionPending ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <div>
              <p className="text-sm text-surface-700 dark:text-surface-300">Enable notifications</p>
              <p className="text-surface-500 text-xs dark:text-surface-400">
                Get notified for task reminders and overdue tasks
              </p>
            </div>
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              disabled={macPermissionPending}
              className="rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed"
            />
          </label>
          {macPermissionPending && (
            <p className="mt-1 text-semantic-warning text-xs">
              Notification permission is required, use the controls below to grant it.
            </p>
          )}
        </div>

        {notifications && (
          <div className="px-4 pb-4">
            <div className="space-y-3 border-surface-200 border-l-2 pl-4 dark:border-surface-600">
              <label
                className={`flex items-center justify-between ${macPermissionPending ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <div>
                  <p className="text-sm text-surface-700 dark:text-surface-300">Reminders</p>
                  <p className="text-surface-500 text-xs dark:text-surface-400">
                    Notify when a task reminder is due
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyReminders}
                  onChange={(e) => setNotifyReminders(e.target.checked)}
                  disabled={macPermissionPending}
                  className="rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed"
                />
              </label>
              <label
                className={`flex items-center justify-between ${macPermissionPending ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <div>
                  <p className="text-sm text-surface-700 dark:text-surface-300">Overdue tasks</p>
                  <p className="text-surface-500 text-xs dark:text-surface-400">
                    Notify when a task's due date has passed
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyOverdue}
                  onChange={(e) => setNotifyOverdue(e.target.checked)}
                  disabled={macPermissionPending}
                  className="rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {isMacPlatform() && permissionStatus !== null && (
        <MacNotificationCard
          permissionStatus={permissionStatus}
          isCheckingPermission={isCheckingPermission}
          requestPermission={requestPermission}
        />
      )}

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label className="flex cursor-pointer items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">App icon badge count</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Show the number of overdue tasks on the app icon
            </p>
          </div>
          <input
            type="checkbox"
            checked={showAppIconBadge}
            onChange={(e) => setShowAppIconBadge(e.target.checked)}
            className="rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Quiet hours</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Suppress all notifications during a set time window
            </p>
          </div>
          <input
            type="checkbox"
            checked={quietHoursEnabled}
            onChange={(e) => setQuietHoursEnabled(e.target.checked)}
            className="rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
        </label>

        {quietHoursEnabled && (
          <div className="px-4 pb-4">
            <div className="space-y-3 border-surface-200 border-l-2 pl-4 dark:border-surface-600">
              <div className="flex items-center justify-between">
                <p className="text-sm text-surface-600 dark:text-surface-400">From</p>
                <button
                  type="button"
                  onClick={() => setQuietHoursStartModalOpen(true)}
                  className="shrink-0 rounded-lg border border-transparent bg-surface-100 px-3 py-1 text-sm text-surface-800 outline-hidden transition-colors hover:bg-surface-200 focus:border-primary-500 focus:bg-white dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800 dark:hover:bg-surface-600"
                >
                  {formatHour(quietHoursStart, use24h)}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-surface-600 dark:text-surface-400">Until</p>
                <button
                  type="button"
                  onClick={() => setQuietHoursEndModalOpen(true)}
                  className="shrink-0 rounded-lg border border-transparent bg-surface-100 px-3 py-1 text-sm text-surface-800 outline-hidden transition-colors hover:bg-surface-200 focus:border-primary-500 focus:bg-white dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800 dark:hover:bg-surface-600"
                >
                  {formatHour(quietHoursEnd, use24h)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <TimePickerModal
        isOpen={quietHoursStartModalOpen}
        onClose={() => setQuietHoursStartModalOpen(false)}
        onConfirm={(hour, _minute) => {
          setQuietHoursStart(hour);
          setQuietHoursStartModalOpen(false);
        }}
        initialHour={quietHoursStart}
        initialMinute={0}
        title="Quiet hours start time"
        description="Notifications will be silenced after this time"
      />

      <TimePickerModal
        isOpen={quietHoursEndModalOpen}
        onClose={() => setQuietHoursEndModalOpen(false)}
        onConfirm={(hour, _minute) => {
          setQuietHoursEnd(hour);
          setQuietHoursEndModalOpen(false);
        }}
        initialHour={quietHoursEnd}
        initialMinute={0}
        title="Quiet hours end time"
        description="Notifications will resume after this time"
      />
    </div>
  );
};
