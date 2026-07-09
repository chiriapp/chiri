import CalendarOff from 'lucide-react/icons/calendar-off';
import FolderSync from 'lucide-react/icons/folder-sync';
import { TaskEditorEmptyState } from '$components/taskEditor/TaskEditorEmptyState';
import { getIconByName } from '$constants/icons';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import type { Account, Task } from '$types';

interface TaskEditorCalendarProps {
  task: Task;
  accounts: Account[];
  onOpenMoveCalendar: () => void;
  readOnly?: boolean;
}

export const TaskEditorCalendar = ({
  task,
  accounts,
  onOpenMoveCalendar,
  readOnly = false,
}: TaskEditorCalendarProps) => {
  const resolveAccent = useAccentColorResolver();
  const resolvedAccentColor = useResolvedAccentColor();
  const allCalendars = accounts.flatMap((account) =>
    account.calendars.map((cal) => ({
      ...cal,
      accountId: account.id,
      accountName: account.name,
    })),
  );

  const currentAccount = accounts.find((a) => a.id === task.accountId);
  const currentCalendar = currentAccount?.calendars.find((c) => c.id === task.calendarId);
  const accountLabel = currentAccount?.name ?? (task.accountId ? `Account ${task.accountId}` : '');
  const calendarLabel =
    currentCalendar?.displayName ?? (task.calendarId ? `Calendar ${task.calendarId}` : '');
  const CurrentCalendarIcon = getIconByName(currentCalendar?.icon || 'calendar');
  const currentCalendarColor = currentCalendar?.color
    ? resolveAccent(currentCalendar.color)
    : resolvedAccentColor;

  if (readOnly) {
    return (
      <div>
        <div
          id="task-calendar-label"
          className="mb-2 flex items-center gap-2 font-medium text-sm text-surface-600 dark:text-surface-400"
        >
          <FolderSync className="h-4 w-4" />
          Calendar
        </div>
        {accountLabel || calendarLabel ? (
          <div className="w-full cursor-not-allowed rounded-lg border border-transparent bg-surface-100 px-3 py-2 text-sm text-surface-700 dark:bg-surface-800 dark:text-surface-300">
            {[accountLabel, calendarLabel].filter(Boolean).join(' / ')}
          </div>
        ) : (
          <TaskEditorEmptyState icon={<CalendarOff className="h-4 w-4 shrink-0" />}>
            No calendar
          </TaskEditorEmptyState>
        )}
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor="task-calendar"
        className="mb-2 flex items-center gap-2 font-medium text-sm text-surface-600 dark:text-surface-400"
      >
        <FolderSync className="h-4 w-4" />
        Calendar
      </label>
      {allCalendars.length > 0 ? (
        <>
          <button
            id="task-calendar"
            type="button"
            onClick={onOpenMoveCalendar}
            className="flex w-full items-center gap-3 rounded-lg border border-transparent bg-surface-100 px-3 py-2 text-left text-sm transition-colors hover:border-surface-300 focus:border-primary-500 focus:bg-white focus:outline-hidden dark:bg-surface-800 dark:focus:bg-surface-800 dark:hover:border-surface-500"
          >
            {currentCalendar?.emoji ? (
              <span
                className="shrink-0 text-lg leading-none"
                style={{ color: currentCalendarColor }}
              >
                {currentCalendar.emoji}
              </span>
            ) : (
              <CurrentCalendarIcon
                className="h-5 w-5 shrink-0"
                style={{ color: currentCalendarColor }}
              />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-surface-700 dark:text-surface-300">
                {calendarLabel || 'Select a calendar...'}
              </span>
              {accountLabel && (
                <span className="block truncate text-surface-500 text-xs dark:text-surface-400">
                  {accountLabel}
                </span>
              )}
            </span>
          </button>
          {task.parentUid && (
            <p className="mt-3 rounded-md border border-semantic-warning/30 bg-semantic-warning/10 p-2 text-surface-700 text-xs dark:text-surface-200">
              Changing the calendar will convert this subtask to a regular task.
            </p>
          )}
        </>
      ) : (
        <div
          className="w-full cursor-not-allowed rounded-lg border border-surface-200 bg-surface-100 px-3 py-2 text-sm text-surface-400 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-500"
          title="Add a CalDAV account to assign tasks to calendars"
        >
          No calendars available
        </div>
      )}
    </div>
  );
};
