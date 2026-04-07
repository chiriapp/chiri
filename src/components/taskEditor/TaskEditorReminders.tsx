import Bell from 'lucide-react/icons/bell';
import BellRing from 'lucide-react/icons/bell-ring';
import Plus from 'lucide-react/icons/plus';
import Settings from 'lucide-react/icons/settings';
import X from 'lucide-react/icons/x';
import type { Task, TimeFormat } from '$types';
import { formatDate, formatTime } from '$utils/date';
import { isMacPlatform } from '$utils/platform';

interface RemindersProps {
  task: Task;
  timeFormat: TimeFormat;
  notifications: boolean;
  onOpenNotificationSettings?: () => void;
  onRemoveReminder: (reminderId: string) => void;
  onOpenReminderPicker: () => void;
  onEditReminder: (reminder: { id: string; trigger: Date }) => void;
}

export const TaskEditorReminders = ({
  task,
  timeFormat,
  notifications,
  onOpenNotificationSettings,
  onRemoveReminder,
  onOpenReminderPicker,
  onEditReminder,
}: RemindersProps) => {
  return (
    <div>
      <div
        id="reminders-label"
        className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
      >
        <Bell className="w-4 h-4" />
        Reminders {(task.reminders?.length ?? 0) > 0 && `(${task.reminders?.length})`}
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: fieldset would change semantic structure; div with role="group" is appropriate here */}
      <div className="space-y-2" role="group" aria-labelledby="reminders-label">
        {(task.reminders ?? []).map((reminder) => (
          // biome-ignore lint/a11y/useSemanticElements: Using div with role=button to allow nested delete button without button nesting
          <div
            key={reminder.id}
            role="button"
            tabIndex={0}
            className="flex items-center gap-2 px-3 py-2 bg-surface-50 dark:bg-surface-800 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors cursor-pointer group outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            onClick={() => onEditReminder({ id: reminder.id, trigger: new Date(reminder.trigger) })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEditReminder({ id: reminder.id, trigger: new Date(reminder.trigger) });
              }
            }}
          >
            <BellRing className="w-4 h-4 text-surface-400 shrink-0" />
            <span className="flex-1 text-sm text-surface-700 dark:text-surface-300">
              {formatDate(new Date(reminder.trigger), true)}{' '}
              {formatTime(new Date(reminder.trigger), timeFormat)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveReminder(reminder.id);
              }}
              className="p-1 text-surface-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-full invisible group-hover:visible focus-visible:visible outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              title="Remove reminder"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {notifications ? (
          <button
            type="button"
            onClick={onOpenReminderPicker}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-surface-50 dark:bg-surface-800 text-surface-500 dark:text-surface-400 border border-surface-200 dark:border-surface-600 rounded-sm hover:border-surface-400 dark:hover:border-surface-500 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <Plus className="w-3 h-3" />
            Add reminder
          </button>
        ) : (
          <div className="flex items-center justify-between gap-2 text-xs text-surface-700 dark:text-surface-300 border border-amber-300 dark:border-amber-700 bg-surface-100 dark:bg-surface-800 rounded-md p-2">
            <span>
              {isMacPlatform()
                ? 'Grant notification permission to add reminders.'
                : 'Enable notifications to add reminders.'}
            </span>
            {onOpenNotificationSettings && (
              <button
                type="button"
                onClick={onOpenNotificationSettings}
                className="flex items-center gap-1 shrink-0 font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 transition-colors outline-hidden focus-visible:underline"
              >
                <Settings className="w-3 h-3" />
                Settings
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
