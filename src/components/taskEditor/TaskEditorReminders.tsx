import ArrowRight from 'lucide-react/icons/arrow-right';
import Bell from 'lucide-react/icons/bell';
import BellOff from 'lucide-react/icons/bell-off';
import BellRing from 'lucide-react/icons/bell-ring';
import Plus from 'lucide-react/icons/plus';
import AlertTriangle from 'lucide-react/icons/triangle-alert';
import X from 'lucide-react/icons/x';
import type { KeyboardEvent } from 'react';
import { TaskEditorEmptyState } from '$components/taskEditor/TaskEditorEmptyState';
import type { Task } from '$types';
import type { TimeFormat } from '$types/preference';
import { formatDate, formatTime } from '$utils/date';
import { isMacPlatform } from '$utils/platform';

interface RemindersProps {
  task: Task;
  timeFormat: TimeFormat;
  notifications: boolean;
  notifyReminders: boolean;
  onOpenNotificationSettings?: () => void;
  onRemoveReminder: (reminderId: string) => void;
  onOpenReminderPicker: () => void;
  onEditReminder: (reminder: { id: string; trigger: Date }) => void;
  readOnly?: boolean;
}

export const TaskEditorReminders = ({
  task,
  timeFormat,
  notifications,
  notifyReminders,
  onOpenNotificationSettings,
  onRemoveReminder,
  onOpenReminderPicker,
  onEditReminder,
  readOnly = false,
}: RemindersProps) => {
  return (
    <div>
      <div
        id="reminders-label"
        className="mb-2 flex items-center gap-2 font-medium text-sm text-surface-600 dark:text-surface-400"
      >
        <Bell className="h-4 w-4" />
        Reminders {(task.reminders?.length ?? 0) > 0 && `(${task.reminders?.length})`}
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: fieldset would change semantic structure; div with role="group" is appropriate here */}
      <div className="space-y-2" role="group" aria-labelledby="reminders-label">
        {(task.reminders ?? []).map((reminder) => (
          <div
            key={reminder.id}
            {...(readOnly
              ? {}
              : {
                  role: 'button' as const,
                  tabIndex: 0,
                  onClick: () =>
                    onEditReminder({ id: reminder.id, trigger: new Date(reminder.trigger) }),
                  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onEditReminder({ id: reminder.id, trigger: new Date(reminder.trigger) });
                    }
                  },
                })}
            className={`group flex items-center gap-2 rounded-lg bg-surface-50 px-3 py-2 outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-800 ${
              readOnly
                ? 'cursor-not-allowed'
                : 'cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-700'
            }`}
          >
            <BellRing className="h-4 w-4 shrink-0 text-surface-400" />
            <span className="flex-1 text-sm text-surface-700 dark:text-surface-300">
              {formatDate(new Date(reminder.trigger), true)}{' '}
              {formatTime(new Date(reminder.trigger), timeFormat)}
            </span>
            {!readOnly && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveReminder(reminder.id);
                }}
                className="invisible rounded-full p-1 text-surface-400 outline-hidden hover:bg-surface-100 hover:text-semantic-error focus-visible:visible focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset group-hover:visible dark:hover:bg-surface-800"
                title="Remove reminder"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}

        {readOnly && (task.reminders?.length ?? 0) === 0 && (
          <TaskEditorEmptyState icon={<BellOff className="h-4 w-4 shrink-0" />}>
            No reminders
          </TaskEditorEmptyState>
        )}

        {!readOnly && notifications && notifyReminders ? (
          <button
            type="button"
            onClick={onOpenReminderPicker}
            className="inline-flex items-center gap-1 rounded-sm border border-surface-200 bg-surface-50 px-2 py-1 text-surface-500 text-xs outline-hidden transition-colors hover:border-surface-400 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:border-surface-600 dark:bg-surface-800 dark:text-surface-400 dark:hover:border-surface-500"
          >
            <Plus className="h-3 w-3" />
            Add reminder
          </button>
        ) : !readOnly ? (
          <div className="flex items-start gap-2 rounded-lg border border-semantic-warning/30 bg-semantic-warning/10 px-3 py-2 text-sm text-surface-700 dark:text-surface-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-semantic-warning" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span>
                {isMacPlatform()
                  ? 'Grant notification permission to add reminders.'
                  : 'Enable notifications to add reminders.'}
              </span>
              {onOpenNotificationSettings && (
                <button
                  type="button"
                  onClick={onOpenNotificationSettings}
                  className="inline-flex items-center gap-1 self-start font-medium text-semantic-warning outline-hidden transition-colors hover:opacity-80 focus-visible:underline"
                >
                  Settings
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
