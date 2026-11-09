import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import AlarmClock from 'lucide-react/icons/alarm-clock';
import CheckSquare from 'lucide-react/icons/check-square';
import Info from 'lucide-react/icons/info';
import TriangleAlert from 'lucide-react/icons/triangle-alert';
import { useState } from 'react';
import { MacNotificationCard } from '$components/MacNotificationCard';
import { TimePickerModal } from '$components/modals/TimePickerModal';
import {
  type NotificationActionConfig,
  NotificationSettingsSortableAction,
} from '$components/settings/NotificationSettings/NotificationSettingsSortableAction';
import { MAX_NOTIFICATION_ACTIONS } from '$constants';
import { useNotificationContext } from '$context/notificationContext';
import { useSettingsStore } from '$context/settingsContext';
import { usePlatform } from '$hooks/system/usePlatform';
import type { NotificationActionKey, SnoozeDuration } from '$types/notifications/settings';
import { isLinuxPlatform, isMacPlatform, isWindowsPlatform } from '$utils/platform';

const formatHour = (hour: number, use24h: boolean) => {
  if (use24h) return `${String(hour).padStart(2, '0')}:00`;
  if (hour === 0) return '12:00 AM';
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return '12:00 PM';
  return `${hour - 12}:00 PM`;
};

const ACTIONS: NotificationActionConfig[] = [
  {
    key: 'complete',
    label: 'Complete',
    description: 'Mark the task as done from the notification',
    icon: <CheckSquare className="h-4 w-4" />,
  },
  {
    key: 'snooze',
    label: 'Snooze',
    description: 'Delay task reminders and remind again later',
    icon: <AlarmClock className="h-4 w-4" />,
  },
];

const ACTION_MAP = Object.fromEntries(ACTIONS.map((action) => [action.key, action])) as Record<
  NotificationActionKey,
  NotificationActionConfig
>;

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
    notificationActions,
    setNotificationActions,
    allDayReminderNotificationsEnabled,
    setAllDayReminderNotificationsEnabled,
    defaultAllDayReminderHour,
    setDefaultAllDayReminderHour,
  } = useSettingsStore();

  const [quietHoursStartModalOpen, setQuietHoursStartModalOpen] = useState(false);
  const [quietHoursEndModalOpen, setQuietHoursEndModalOpen] = useState(false);
  const [allDayReminderTimeModalOpen, setAllDayReminderTimeModalOpen] = useState(false);
  const [activeDragKey, setActiveDragKey] = useState<NotificationActionKey | null>(null);

  const use24h = timeFormat === '24';
  const { permissionStatus, notificationAlertStyle, isCheckingPermission, requestPermission } =
    useNotificationContext();
  const isMac = isMacPlatform();

  // on macOS the toggle is gated behind OS permission
  // must be granted or provisional before the user can enable/disable it in-app
  const macPermissionPending =
    isMacPlatform() && permissionStatus !== 'granted' && permissionStatus !== 'provisional';

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const orderedActions = notificationActions.order
    .map((key) => ACTION_MAP[key])
    .filter(Boolean) as NotificationActionConfig[];

  const toggleAction = (key: NotificationActionKey, value: boolean) => {
    const nextActions = { ...notificationActions, [key]: value };
    if (key === 'complete' && value) {
      nextActions.snoozeDurations = nextActions.snoozeDurations.slice(
        0,
        MAX_NOTIFICATION_ACTIONS - 1,
      );
    }
    setNotificationActions(nextActions);
  };

  const setSnoozeDurations = (durations: SnoozeDuration[]) => {
    setNotificationActions({ ...notificationActions, snoozeDurations: durations });
  };

  const handleActionDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDragKey(null);
    if (!over || active.id === over.id) return;
    const oldIndex = notificationActions.order.indexOf(active.id as NotificationActionKey);
    const newIndex = notificationActions.order.indexOf(over.id as NotificationActionKey);
    if (oldIndex === -1 || newIndex === -1) return;
    setNotificationActions({
      ...notificationActions,
      order: arrayMove(notificationActions.order, oldIndex, newIndex),
    });
  };

  const handleActionDragStart = ({ active }: DragStartEvent) => {
    setActiveDragKey(active.id as NotificationActionKey);
  };

  const isLinux = isLinuxPlatform();
  const isWindows = isWindowsPlatform();
  const { isGNOME, isKDE } = usePlatform();

  const platformActionWarning = isMac
    ? null
    : isWindows
      ? 'Windows supports up to 5 action buttons, though labels may become cramped or truncated.'
      : isLinux && isGNOME
        ? 'GNOME usually displays up to 3 action buttons; extra buttons may be hidden.'
        : isLinux && isKDE
          ? 'KDE supports many action buttons, but larger sets may make notifications wide or truncate labels.'
          : isLinux
            ? 'Notification action support varies across Linux desktop environments; extra buttons may be hidden.'
            : 'Notification action support varies by platform; extra buttons may be hidden.';

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">
        Notifications
      </h3>

      {isMac && permissionStatus !== null && (
        <MacNotificationCard
          permissionStatus={permissionStatus}
          isCheckingPermission={isCheckingPermission}
          requestPermission={requestPermission}
          alertStyle={notificationAlertStyle}
        />
      )}

      <div className="overflow-hidden rounded-lg border border-surface-300 bg-white dark:border-surface-700 dark:bg-surface-800">
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
              className="rounded-sm border-surface-400 outline-hidden focus:ring-2 focus:ring-primary-ink focus:ring-offset-2 disabled:cursor-not-allowed"
            />
          </label>
          {macPermissionPending && (
            <div className="mt-3 flex gap-2 rounded-lg border border-semantic-warning/30 bg-semantic-warning/10 px-3 py-2 text-surface-700 text-xs dark:text-surface-300">
              <TriangleAlert className="mt-px size-3.5 shrink-0 text-semantic-warning" />
              <span>
                Notification permissions are required. Use the controls above to grant them.
              </span>
            </div>
          )}
        </div>

        {notifications && (
          <div className="px-4 pb-4">
            <div className="space-y-3 border-surface-300 border-l-2 pl-4 dark:border-surface-600">
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
                  className="rounded-sm border-surface-400 outline-hidden focus:ring-2 focus:ring-primary-ink focus:ring-offset-2 disabled:cursor-not-allowed"
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
                  className="rounded-sm border-surface-400 outline-hidden focus:ring-2 focus:ring-primary-ink focus:ring-offset-2 disabled:cursor-not-allowed"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-300 bg-white dark:border-surface-700 dark:bg-surface-800">
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
            className="rounded-sm border-surface-400 outline-hidden focus:ring-2 focus:ring-primary-ink focus:ring-offset-2 disabled:cursor-not-allowed"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-300 bg-white dark:border-surface-700 dark:bg-surface-800">
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
            className="rounded-sm border-surface-400 outline-hidden focus:ring-2 focus:ring-primary-ink focus:ring-offset-2"
          />
        </label>

        {quietHoursEnabled && (
          <div className="px-4 pb-4">
            <div className="space-y-3 border-surface-300 border-l-2 pl-4 dark:border-surface-600">
              <div className="flex items-center justify-between">
                <p className="text-sm text-surface-600 dark:text-surface-400">From</p>
                <button
                  type="button"
                  onClick={() => setQuietHoursStartModalOpen(true)}
                  className="shrink-0 rounded-lg border border-transparent bg-surface-100 px-3 py-1 text-sm text-surface-800 outline-hidden transition-colors hover:bg-surface-200 focus:border-primary-ink focus:bg-white dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800 dark:hover:bg-surface-600"
                >
                  {formatHour(quietHoursStart, use24h)}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-surface-600 dark:text-surface-400">Until</p>
                <button
                  type="button"
                  onClick={() => setQuietHoursEndModalOpen(true)}
                  className="shrink-0 rounded-lg border border-transparent bg-surface-100 px-3 py-1 text-sm text-surface-800 outline-hidden transition-colors hover:bg-surface-200 focus:border-primary-ink focus:bg-white dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800 dark:hover:bg-surface-600"
                >
                  {formatHour(quietHoursEnd, use24h)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-300 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">All-day reminders</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Add default reminders to all-day tasks
            </p>
          </div>
          <input
            type="checkbox"
            checked={allDayReminderNotificationsEnabled}
            onChange={(e) => setAllDayReminderNotificationsEnabled(e.target.checked)}
            className="rounded-sm border-surface-400 outline-hidden focus:ring-2 focus:ring-primary-ink focus:ring-offset-2"
          />
        </label>

        {allDayReminderNotificationsEnabled && (
          <div className="px-4 pb-4">
            <div className="border-surface-300 border-l-2 pl-4 dark:border-surface-600">
              <div className="flex items-center justify-between">
                <p className="text-sm text-surface-600 dark:text-surface-400">Notification time</p>
                <button
                  type="button"
                  onClick={() => setAllDayReminderTimeModalOpen(true)}
                  className="shrink-0 rounded-lg border border-transparent bg-surface-100 px-3 py-1 text-sm text-surface-800 outline-hidden transition-colors hover:bg-surface-200 focus:border-primary-ink focus:bg-white dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800 dark:hover:bg-surface-600"
                >
                  {formatHour(defaultAllDayReminderHour, use24h)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">
        Notification actions
      </h4>
      {macPermissionPending ? (
        <div className="flex items-start gap-2 rounded-lg border border-semantic-warning/30 bg-semantic-warning/10 px-3 py-2 text-surface-700 text-xs dark:text-surface-300">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-semantic-warning" />
          <span>
            Notification actions are disabled until notification permissions are granted. Use the
            controls above to grant permission.
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-semantic-info/30 bg-semantic-info/10 px-3 py-2 text-surface-700 text-xs dark:text-surface-300">
          <Info className="mt-0.5 size-3.5 shrink-0 text-semantic-info" />
          <div className="space-y-1">
            {platformActionWarning && <p>{platformActionWarning}</p>}
            <p>
              Chiri allows up to {MAX_NOTIFICATION_ACTIONS} actions per notification. Complete uses
              one slot, and each snooze duration uses one slot.
            </p>
          </div>
        </div>
      )}
      <div
        className={`overflow-hidden rounded-lg border border-surface-300 bg-white dark:border-surface-700 dark:bg-surface-800 ${macPermissionPending ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleActionDragStart}
          onDragEnd={handleActionDragEnd}
        >
          <SortableContext items={notificationActions.order} strategy={verticalListSortingStrategy}>
            {orderedActions.map((action, index) => (
              <NotificationSettingsSortableAction
                key={action.key}
                action={action}
                showBorder={index > 0}
                checked={notificationActions[action.key]}
                complete={notificationActions.complete}
                disabled={macPermissionPending}
                snoozeDurations={notificationActions.snoozeDurations}
                onToggle={toggleAction}
                onSnoozeDurationsChange={setSnoozeDurations}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {activeDragKey ? (
              <NotificationSettingsSortableAction
                action={ACTION_MAP[activeDragKey]}
                showBorder={false}
                checked={notificationActions[activeDragKey]}
                complete={notificationActions.complete}
                disabled={macPermissionPending}
                snoozeDurations={notificationActions.snoozeDurations}
                onToggle={toggleAction}
                onSnoozeDurationsChange={setSnoozeDurations}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
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

      <TimePickerModal
        isOpen={allDayReminderTimeModalOpen}
        onClose={() => setAllDayReminderTimeModalOpen(false)}
        onConfirm={(hour, _minute) => {
          setDefaultAllDayReminderHour(hour);
          setAllDayReminderTimeModalOpen(false);
        }}
        initialHour={defaultAllDayReminderHour}
        initialMinute={0}
        title="All-day reminder time"
        description="Default time for all-day task reminders"
      />
    </div>
  );
};
