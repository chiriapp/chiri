import FolderSync from 'lucide-react/icons/folder-sync';
import { AppSelect } from '$components/AppSelect';
import type { Account, Task } from '$types';

interface TaskEditorCalendarProps {
  task: Task;
  accounts: Account[];
  onCalendarChange: (calendarId: string) => void;
}

export const TaskEditorCalendar = ({
  task,
  accounts,
  onCalendarChange,
}: TaskEditorCalendarProps) => {
  const allCalendars = accounts.flatMap((account) =>
    account.calendars.map((cal) => ({
      ...cal,
      accountId: account.id,
      accountName: account.name,
    })),
  );

  const currentAccount = accounts.find((a) => a.id === task.accountId);
  const currentCalendar = currentAccount?.calendars.find((c) => c.id === task.calendarId);

  return (
    <div>
      <label
        htmlFor="task-calendar"
        className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
      >
        <FolderSync className="w-4 h-4" />
        Calendar
      </label>
      {allCalendars.length > 0 ? (
        <>
          <AppSelect
            id="task-calendar"
            value={task.calendarId}
            onChange={(e) => onCalendarChange(e.target.value)}
            className="w-full text-sm border border-transparent bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
          >
            {accounts.map((account) => (
              <optgroup key={account.id} label={account.name}>
                {account.calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.displayName}
                  </option>
                ))}
              </optgroup>
            ))}
          </AppSelect>
          {currentCalendar && currentAccount && (
            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
              Currently in: {currentAccount.name} / {currentCalendar.displayName}
            </p>
          )}
          {task.parentUid && (
            <p className="mt-3 text-xs text-surface-700 dark:text-surface-200 border border-semantic-warning/30 bg-semantic-warning/10 rounded-md p-2">
              Changing the calendar will convert this subtask to a regular task.
            </p>
          )}
        </>
      ) : (
        <div
          className="w-full px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-900 text-surface-400 dark:text-surface-500 rounded-lg cursor-not-allowed"
          title="Add a CalDAV account to assign tasks to calendars"
        >
          No calendars available
        </div>
      )}
    </div>
  );
};
