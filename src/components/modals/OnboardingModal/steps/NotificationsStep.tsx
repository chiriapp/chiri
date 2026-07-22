import Bell from 'lucide-react/icons/bell';
import BellOff from 'lucide-react/icons/bell-off';
import Clock from 'lucide-react/icons/clock';
import Hash from 'lucide-react/icons/hash';
import { MacNotificationCard } from '$components/MacNotificationCard';
import { ToggleRow } from '$components/modals/OnboardingModal/ToggleRow';

import type {
  NotificationPermissionResult,
  NotificationPermissionStatus,
} from '$types/notification';

interface NotificationsStepProps {
  isMac: boolean;
  permissionStatus: NotificationPermissionStatus | null;
  isCheckingPermission: boolean;
  requestPermission: () => Promise<NotificationPermissionResult>;
  macPermissionPending: boolean;
  notifications: boolean;
  onNotificationsChange: (enabled: boolean) => void;
  notifyReminders: boolean;
  onNotifyRemindersChange: (enabled: boolean) => void;
  notifyOverdue: boolean;
  onNotifyOverdueChange: (enabled: boolean) => void;
  showAppIconBadge: boolean;
  onShowAppIconBadgeChange: (enabled: boolean) => void;
}

export const NotificationsStep = ({
  isMac,
  permissionStatus,
  isCheckingPermission,
  requestPermission,
  macPermissionPending,
  notifications,
  onNotificationsChange,
  notifyReminders,
  onNotifyRemindersChange,
  notifyOverdue,
  onNotifyOverdueChange,
  showAppIconBadge,
  onShowAppIconBadgeChange,
}: NotificationsStepProps) => (
  <div className="flex flex-1 flex-col justify-between gap-5">
    <div>
      <h2 className="font-semibold text-2xl text-surface-950 dark:text-surface-50">
        Notifications
      </h2>
      <p className="mt-2 text-sm text-surface-600 leading-6 dark:text-surface-400">
        Choose how Chiri nudges you about due tasks.
      </p>
    </div>

    {isMac && permissionStatus !== null && (
      <MacNotificationCard
        permissionStatus={permissionStatus}
        isCheckingPermission={isCheckingPermission}
        requestPermission={requestPermission}
        density="compact"
      />
    )}

    <section className="space-y-2 rounded-lg border border-surface-200 p-3 dark:border-surface-700">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary-500" />
        <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-100">Alerts</h3>
      </div>
      <ToggleRow
        icon={<Bell className="h-4 w-4" />}
        label="Desktop notifications"
        description="Allow Chiri to send system notifications."
        checked={notifications}
        disabled={macPermissionPending}
        onChange={onNotificationsChange}
      />
      {notifications && (
        <div className="space-y-2 border-surface-200 border-l-2 pl-4 dark:border-surface-600">
          <ToggleRow
            icon={<BellOff className="h-4 w-4" />}
            label="Reminder alerts"
            description="Use reminder times saved on tasks."
            checked={notifyReminders}
            disabled={macPermissionPending}
            onChange={onNotifyRemindersChange}
          />
          <ToggleRow
            icon={<Clock className="h-4 w-4" />}
            label="Overdue tasks"
            description="Notify when a task's due date has passed."
            checked={notifyOverdue}
            disabled={macPermissionPending}
            onChange={onNotifyOverdueChange}
          />
        </div>
      )}
    </section>

    <section className="space-y-2 rounded-lg border border-surface-200 p-3 dark:border-surface-700">
      <div className="flex items-center gap-2">
        <Hash className="h-4 w-4 text-primary-500" />
        <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-100">Badge</h3>
      </div>
      <ToggleRow
        icon={<Hash className="h-4 w-4" />}
        label="App icon badge count"
        description="Show the number of overdue tasks on the app icon."
        checked={showAppIconBadge}
        onChange={onShowAppIconBadgeChange}
      />
    </section>
  </div>
);
