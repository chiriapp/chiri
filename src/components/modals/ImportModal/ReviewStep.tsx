import AlertTriangle from 'lucide-react/icons/alert-triangle';
import CalendarIcon from 'lucide-react/icons/calendar';
import Check from 'lucide-react/icons/check';
import CheckCircle from 'lucide-react/icons/check-circle';
import ChevronDown from 'lucide-react/icons/chevron-down';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Circle from 'lucide-react/icons/circle';
import Flag from 'lucide-react/icons/flag';
import Loader2 from 'lucide-react/icons/loader-2';
import { useState } from 'react';
import type { Calendar } from '$types';
import type { ParsedTaskWithStatus } from '$types/import';

interface ReviewStepProps {
  tasks: ParsedTaskWithStatus[];
  selectedCalendar: Calendar | undefined;
  isImporting: boolean;
  importProgress: number;
}

const PRIORITY_CONFIG = {
  high: { label: 'High', color: 'text-priority-high' },
  medium: { label: 'Med', color: 'text-priority-medium' },
  low: { label: 'Low', color: 'text-priority-low' },
  none: { label: '', color: '' },
} as const;

const formatDate = (date: Date | string | undefined) => {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  const isThisYear = d.getFullYear() === now.getFullYear();

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(isThisYear ? {} : { year: 'numeric' }),
  });
};

export const ReviewStep = ({
  tasks,
  selectedCalendar,
  isImporting,
  importProgress,
}: ReviewStepProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const completedTasks = tasks.filter((t) => t.completed);
  const pendingTasks = tasks.filter((t) => !t.completed);
  const MAX_VISIBLE = 5;

  const displayTasks = isExpanded ? tasks : tasks.slice(0, MAX_VISIBLE);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between rounded-lg bg-surface-50 p-3 dark:bg-surface-700/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-200 dark:bg-surface-700">
            <span className="font-semibold text-lg text-surface-900 dark:text-surface-100">
              {tasks.length}
            </span>
          </div>
          <div>
            <p className="font-medium text-sm text-surface-800 dark:text-surface-200">
              {tasks.length === 1 ? '1 task' : `${tasks.length} tasks`} ready to import
            </p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              {completedTasks.length > 0 && (
                <span>
                  {completedTasks.length} completed, {pendingTasks.length} pending
                </span>
              )}
              {completedTasks.length === 0 && <span>All pending</span>}
            </p>
          </div>
        </div>

        {selectedCalendar && (
          <div className="flex items-center gap-2 text-surface-500 text-xs dark:text-surface-400">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: selectedCalendar.color || '#3b82f6' }}
            />
            <span className="hidden sm:inline">{selectedCalendar.displayName}</span>
          </div>
        )}
      </div>

      {/* Progress bar during import */}
      {isImporting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-surface-600 dark:text-surface-400">Importing...</span>
            <span className="text-surface-500 dark:text-surface-400">
              {Math.round(importProgress)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
            <div
              className="h-full bg-primary-500 transition-all duration-300 ease-out"
              style={{ width: `${importProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Task list preview */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 rounded-sm font-medium text-sm text-surface-600 outline-hidden transition-colors hover:text-surface-800 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-400 dark:hover:text-surface-200"
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span>Preview tasks</span>
        </button>

        {isExpanded && (
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-surface-200 dark:border-surface-700">
            {displayTasks.map((task, index) => (
              <div
                key={task.uid || `task-${index}`}
                className={`flex items-center gap-2 px-3 py-2 text-sm ${
                  index !== displayTasks.length - 1
                    ? 'border-surface-100 border-b dark:border-surface-700/50'
                    : ''
                } ${
                  task.importStatus === 'success'
                    ? 'bg-semantic-success/10'
                    : task.importStatus === 'error'
                      ? 'bg-semantic-error/10'
                      : ''
                }`}
              >
                {/* Status indicator */}
                <div className="shrink-0">
                  {task.importStatus === 'importing' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                  ) : task.importStatus === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-semantic-success" />
                  ) : task.importStatus === 'error' ? (
                    <AlertTriangle className="h-4 w-4 text-semantic-error" />
                  ) : task.completed ? (
                    <Check className="h-4 w-4 text-surface-400" />
                  ) : (
                    <Circle className="h-4 w-4 text-surface-300 dark:text-surface-600" />
                  )}
                </div>

                {/* Task title */}
                <span
                  className={`flex-1 truncate ${
                    task.completed
                      ? 'text-surface-500 line-through dark:text-surface-400'
                      : 'text-surface-700 dark:text-surface-300'
                  }`}
                >
                  {task.title || 'Untitled'}
                </span>

                {/* Metadata badges */}
                <div className="flex shrink-0 items-center gap-1.5">
                  {task.priority && task.priority !== 'none' && (
                    <span
                      className={`flex items-center gap-0.5 text-xs ${PRIORITY_CONFIG[task.priority].color}`}
                    >
                      <Flag className="h-3 w-3" />
                    </span>
                  )}
                  {task.dueDate && (
                    <span className="flex items-center gap-0.5 text-surface-500 text-xs dark:text-surface-400">
                      <CalendarIcon className="h-3 w-3" />
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {!isExpanded && tasks.length > MAX_VISIBLE && (
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="w-full py-2 font-medium text-primary-600 text-xs outline-hidden hover:text-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-primary-400 dark:hover:text-primary-300"
              >
                Show {tasks.length - MAX_VISIBLE} more tasks
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
