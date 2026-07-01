import CalendarClock from 'lucide-react/icons/calendar-clock';
import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Clock from 'lucide-react/icons/clock';
import FolderSync from 'lucide-react/icons/folder-sync';
import Link from 'lucide-react/icons/link';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Tag from 'lucide-react/icons/tag';
import Timer from 'lucide-react/icons/timer';
import { Fragment, type ReactNode } from 'react';
import { useSettingsStore } from '$context/settingsContext';
import type { TaskBadgeKey } from '$types/settings';

const PREVIEW_BADGE_RENDERERS: Record<TaskBadgeKey, () => ReactNode> = {
  startDate: () => (
    <span
      className="inline-flex items-center gap-1 rounded-sm border bg-surface-100 px-2 py-0.5 font-medium text-surface-600 text-xs dark:bg-surface-700 dark:text-surface-400"
      style={{ borderColor: '#9b7fd4' }}
    >
      <CalendarClock className="h-3 w-3 shrink-0" style={{ color: '#9b7fd4' }} />
      Next week
    </span>
  ),
  dueDate: () => (
    <span className="inline-flex items-center gap-1 rounded-sm border border-amber-300 bg-amber-50 px-2 py-0.5 font-medium text-amber-700 text-xs dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
      <Clock className="h-3 w-3 shrink-0" />
      Today
    </span>
  ),
  tags: () => (
    <span
      className="inline-flex items-center gap-1 rounded-sm border bg-surface-100 px-2 py-0.5 font-medium text-surface-700 text-xs dark:bg-surface-700 dark:text-surface-300"
      style={{ borderColor: '#3b82f6' }}
    >
      <Tag className="h-3 w-3 shrink-0" style={{ color: '#3b82f6' }} />
      Home
    </span>
  ),
  calendar: () => (
    <span className="inline-flex items-center gap-1 rounded-sm border border-surface-200 bg-surface-100 px-2 py-0.5 font-medium text-surface-700 text-xs dark:border-surface-600 dark:bg-surface-700 dark:text-surface-300">
      <FolderSync className="h-3 w-3 shrink-0" style={{ color: '#22c55e' }} />
      Personal
    </span>
  ),
  url: () => (
    <span className="inline-flex items-center gap-1 rounded-sm border border-surface-200 bg-surface-100 px-2 py-0.5 font-medium text-surface-500 text-xs dark:border-surface-600 dark:bg-surface-700 dark:text-surface-400">
      <Link className="h-3 w-3 shrink-0 text-primary-500" />
      URL
    </span>
  ),
  status: () => (
    <span className="inline-flex items-center gap-1 rounded-sm border border-status-in-process/30 bg-status-in-process/10 px-2 py-0.5 font-medium text-status-in-process text-xs">
      <Timer className="h-3 w-3 shrink-0 text-status-in-process" />
      50%
    </span>
  ),
  repeat: () => (
    <span className="inline-flex max-w-36 items-center gap-1 rounded-sm border border-surface-300 bg-surface-50 px-2 py-0.5 font-medium text-surface-600 text-xs dark:border-surface-600 dark:bg-surface-800 dark:text-surface-400">
      <RefreshCw className="h-3 w-3 shrink-0" />
      <span className="truncate">Weekly</span>
    </span>
  ),
  subtasks: () => (
    <span className="inline-flex items-center gap-1 rounded-sm border border-surface-300 bg-surface-50 px-2 py-0.5 font-medium text-surface-600 text-xs dark:border-surface-600 dark:bg-surface-800 dark:text-surface-400">
      <CheckCircle2 className="h-3 w-3 shrink-0" />
      2/5
    </span>
  ),
};

export const BadgesSettingsPreview = () => {
  const { taskBadgeVisibility, taskBadgeOrder, taskListDensity } = useSettingsStore();
  const isCompact = taskListDensity === 'compact';

  const hasAnyVisible = (taskBadgeOrder as TaskBadgeKey[]).some((key) => taskBadgeVisibility[key]);

  const badgeRow = hasAnyVisible ? (
    <div
      className={`flex items-center gap-2 ${isCompact ? 'shrink-0 overflow-hidden' : 'mt-2 flex-wrap'}`}
    >
      {(taskBadgeOrder as TaskBadgeKey[]).map((key) =>
        taskBadgeVisibility[key] ? (
          <Fragment key={key}>{PREVIEW_BADGE_RENDERERS[key]()}</Fragment>
        ) : null,
      )}
    </div>
  ) : null;

  return (
    <div className="mt-4 rounded-lg bg-surface-50 p-3 dark:bg-surface-900/30" aria-hidden="true">
      <div
        className={`flex items-start gap-3 rounded-lg border border-surface-200 bg-white pr-3 pl-3 shadow-xs dark:border-surface-700 dark:bg-surface-800 ${
          isCompact ? 'py-2' : 'py-3'
        }`}
      >
        {/* Checkbox */}
        <div className="mt-0.5 shrink-0">
          <span className="flex h-5 w-5 rounded-sm border-2 border-surface-300 dark:border-surface-600" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {isCompact ? (
            <div className="flex min-w-0 items-center gap-2 overflow-hidden">
              <span className="min-w-0 shrink truncate font-medium text-sm text-surface-800 dark:text-surface-200">
                Plan weekend errands
              </span>
              {badgeRow}
            </div>
          ) : (
            <>
              <div className="truncate font-medium text-sm text-surface-800 leading-5 dark:text-surface-200">
                Plan weekend errands
              </div>
              <div className="mt-1 truncate text-surface-500 text-xs dark:text-surface-400">
                Groceries, pharmacy, and library pickup
              </div>
              {badgeRow}
            </>
          )}
        </div>

        {/* Chevron */}
        <ChevronRight className="h-5 w-5 shrink-0 text-surface-300 dark:text-surface-600" />
      </div>
    </div>
  );
};
