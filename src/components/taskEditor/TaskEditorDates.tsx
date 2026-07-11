import Calendar from 'lucide-react/icons/calendar';
import CalendarClock from 'lucide-react/icons/calendar-clock';
import CalendarFold from 'lucide-react/icons/calendar-fold';
import CalendarPlus from 'lucide-react/icons/calendar-plus';
import CalendarX from 'lucide-react/icons/calendar-x';
import type { Task } from '$types';
import type { TimeFormat } from '$types/preference';
import { formatDate, formatTime } from '$utils/date';

interface TaskEditorDatesProps {
  task: Task;
  timeFormat: TimeFormat;
  onOpenStartDate: () => void;
  onOpenDueDate: () => void;
  readOnly?: boolean;
}

export const TaskEditorDates = ({
  task,
  timeFormat,
  onOpenStartDate,
  onOpenDueDate,
  readOnly = false,
}: TaskEditorDatesProps) => {
  return (
    <div className="space-y-4">
      <div>
        <div
          id="start-date-label"
          className="mb-2 flex items-center gap-2 font-medium text-sm text-surface-600 dark:text-surface-400"
        >
          <CalendarClock className="h-4 w-4" />
          Start Date
        </div>
        <button
          type="button"
          onClick={onOpenStartDate}
          disabled={readOnly}
          aria-labelledby="start-date-label"
          className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus:border-primary-500 focus:bg-white focus:outline-hidden dark:focus:bg-surface-800 ${
            readOnly && !task.startDate
              ? 'cursor-not-allowed border-surface-300 border-dashed text-surface-400 dark:border-surface-700 dark:text-surface-500'
              : 'border-transparent bg-surface-100 focus:bg-white dark:bg-surface-800'
          } ${!readOnly ? 'hover:border-surface-300 dark:hover:border-surface-500' : ''}`}
        >
          {task.startDate ? (
            <Calendar className="h-4 w-4 shrink-0 text-surface-400" />
          ) : readOnly ? (
            <CalendarX className="h-4 w-4 shrink-0" />
          ) : (
            <CalendarPlus className="h-4 w-4 shrink-0 text-surface-400" />
          )}
          <span
            className={
              task.startDate
                ? 'text-surface-700 dark:text-surface-300'
                : 'text-surface-400 dark:text-surface-500'
            }
          >
            {task.startDate
              ? task.startDateAllDay
                ? `${formatDate(new Date(task.startDate), true)} (All day)`
                : `${formatDate(new Date(task.startDate), true)} ${formatTime(new Date(task.startDate), timeFormat)}`
              : readOnly
                ? 'No start date'
                : 'Set start date...'}
          </span>
        </button>
      </div>
      <div>
        <div
          id="due-date-label"
          className="mb-2 flex items-center gap-2 font-medium text-sm text-surface-600 dark:text-surface-400"
        >
          <CalendarFold className="h-4 w-4" />
          Due Date
        </div>
        <button
          type="button"
          onClick={onOpenDueDate}
          disabled={readOnly}
          aria-labelledby="due-date-label"
          className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus:border-primary-500 focus:bg-white focus:outline-hidden dark:focus:bg-surface-800 ${
            readOnly && !task.dueDate
              ? 'cursor-not-allowed border-surface-300 border-dashed text-surface-400 dark:border-surface-700 dark:text-surface-500'
              : 'border-transparent bg-surface-100 focus:bg-white dark:bg-surface-800'
          } ${!readOnly ? 'hover:border-surface-300 dark:hover:border-surface-500' : ''}`}
        >
          {task.dueDate ? (
            <Calendar className="h-4 w-4 shrink-0 text-surface-400" />
          ) : readOnly ? (
            <CalendarX className="h-4 w-4 shrink-0" />
          ) : (
            <CalendarPlus className="h-4 w-4 shrink-0 text-surface-400" />
          )}
          <span
            className={
              task.dueDate
                ? 'text-surface-700 dark:text-surface-300'
                : 'text-surface-400 dark:text-surface-500'
            }
          >
            {task.dueDate
              ? task.dueDateAllDay
                ? `${formatDate(new Date(task.dueDate), true)} (All day)`
                : `${formatDate(new Date(task.dueDate), true)} ${formatTime(new Date(task.dueDate), timeFormat)}`
              : readOnly
                ? 'No due date'
                : 'Set due date...'}
          </span>
        </button>
      </div>
    </div>
  );
};
