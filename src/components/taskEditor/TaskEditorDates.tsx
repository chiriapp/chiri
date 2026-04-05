import { CalendarPlus } from 'lucide-react';
import Calendar from 'lucide-react/icons/calendar';
import CalendarClock from 'lucide-react/icons/calendar-clock';
import CalendarFold from 'lucide-react/icons/calendar-fold';
import type { Task, TimeFormat } from '$types';
import { formatDate, formatTime } from '$utils/date';

interface TaskEditorDatesProps {
  task: Task;
  timeFormat: TimeFormat;
  onOpenStartDate: () => void;
  onOpenDueDate: () => void;
}

export const TaskEditorDates = ({
  task,
  timeFormat,
  onOpenStartDate,
  onOpenDueDate,
}: TaskEditorDatesProps) => {
  return (
    <div className="space-y-4">
      <div>
        <div
          id="start-date-label"
          className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
        >
          <CalendarClock className="w-4 h-4" />
          Start Date
        </div>
        <button
          type="button"
          onClick={onOpenStartDate}
          aria-labelledby="start-date-label"
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left bg-surface-100 dark:bg-surface-800 border border-transparent rounded-lg hover:border-surface-300 dark:hover:border-surface-500 focus:outline-hidden focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
        >
          {task.startDate ? (
            <Calendar className="w-4 h-4 text-surface-400 shrink-0" />
          ) : (
            <CalendarPlus className="w-4 h-4 text-surface-400 shrink-0" />
          )}
          <span
            className={
              task.startDate ? 'text-surface-700 dark:text-surface-300' : 'text-surface-400'
            }
          >
            {task.startDate
              ? task.startDateAllDay
                ? `${formatDate(new Date(task.startDate), true)} (All day)`
                : `${formatDate(new Date(task.startDate), true)} ${formatTime(new Date(task.startDate), timeFormat)}`
              : 'Set start date...'}
          </span>
        </button>
      </div>
      <div>
        <div
          id="due-date-label"
          className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
        >
          <CalendarFold className="w-4 h-4" />
          Due Date
        </div>
        <button
          type="button"
          onClick={onOpenDueDate}
          aria-labelledby="due-date-label"
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left bg-surface-100 dark:bg-surface-800 border border-transparent rounded-lg hover:border-surface-300 dark:hover:border-surface-500 focus:outline-hidden focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
        >
          {task.dueDate ? (
            <Calendar className="w-4 h-4 text-surface-400 shrink-0" />
          ) : (
            <CalendarPlus className="w-4 h-4 text-surface-400 shrink-0" />
          )}
          <span
            className={task.dueDate ? 'text-surface-700 dark:text-surface-300' : 'text-surface-400'}
          >
            {task.dueDate
              ? task.dueDateAllDay
                ? `${formatDate(new Date(task.dueDate), true)} (All day)`
                : `${formatDate(new Date(task.dueDate), true)} ${formatTime(new Date(task.dueDate), timeFormat)}`
              : 'Set due date...'}
          </span>
        </button>
      </div>
    </div>
  );
};
