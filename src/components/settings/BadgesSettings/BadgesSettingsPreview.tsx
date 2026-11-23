import BellOff from 'lucide-react/icons/bell-off';
import CalendarClock from 'lucide-react/icons/calendar-clock';
import CheckCheck from 'lucide-react/icons/check-check';
import ChevronDown from 'lucide-react/icons/chevron-down';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Clock from 'lucide-react/icons/clock';
import FolderSync from 'lucide-react/icons/folder-sync';
import Link from 'lucide-react/icons/link';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Tag from 'lucide-react/icons/tag';
import Timer from 'lucide-react/icons/timer';
import { Fragment, type ReactNode } from 'react';
import { TaskItemBadge } from '$components/taskItem/badges/TaskItemBadge';
import { useSettingsStore } from '$context/settingsContext';
import type { TaskBadgeKey } from '$types/settings/categories/editor';

const PREVIEW_BADGE_RENDERERS: Record<TaskBadgeKey, () => ReactNode> = {
  startDate: () => (
    <TaskItemBadge color="#9b7fd4">
      <CalendarClock className="h-3 w-3 shrink-0" />
      Next week
    </TaskItemBadge>
  ),
  dueDate: () => (
    <TaskItemBadge tone="due-today">
      <Clock className="h-3 w-3 shrink-0" />
      Today
    </TaskItemBadge>
  ),
  tags: () => (
    <TaskItemBadge color="#3b82f6">
      <Tag className="h-3 w-3 shrink-0" />
      Home
    </TaskItemBadge>
  ),
  calendar: () => (
    <TaskItemBadge color="#22c55e">
      <FolderSync className="h-3 w-3 shrink-0" />
      Personal
    </TaskItemBadge>
  ),
  url: () => (
    <TaskItemBadge tone="primary">
      <Link className="h-3 w-3 shrink-0" />
      URL
    </TaskItemBadge>
  ),
  status: () => (
    <TaskItemBadge tone="in-process">
      <Timer className="h-3 w-3 shrink-0" />
      50%
    </TaskItemBadge>
  ),
  snooze: () => (
    <TaskItemBadge tone="info">
      <BellOff className="h-3 w-3 shrink-0" />
      Snoozed
    </TaskItemBadge>
  ),
  repeat: () => (
    <TaskItemBadge className="max-w-36">
      <RefreshCw className="h-3 w-3 shrink-0" />
      <span className="truncate">Weekly</span>
    </TaskItemBadge>
  ),
  subtasks: () => (
    <TaskItemBadge className="gap-0.5">
      <CheckCheck className="h-3 w-3 shrink-0" />
      <span>2/5</span>
      <ChevronDown className="h-3 w-3 shrink-0" />
    </TaskItemBadge>
  ),
};

export const BadgesSettingsPreview = () => {
  const { taskBadgeVisibility, taskBadgeOrder, taskListDensity } = useSettingsStore();
  const isCompact = taskListDensity === 'compact';

  const hasAnyVisible = (taskBadgeOrder as TaskBadgeKey[]).some((key) => taskBadgeVisibility[key]);

  const visibleBadges = (taskBadgeOrder as TaskBadgeKey[]).map((key) =>
    taskBadgeVisibility[key] ? (
      <Fragment key={key}>{PREVIEW_BADGE_RENDERERS[key]()}</Fragment>
    ) : null,
  );

  const badgeRow = hasAnyVisible ? (
    <div className={`${isCompact ? 'mt-1 gap-1' : 'mt-2 gap-2'} flex flex-wrap items-center`}>
      {visibleBadges}
    </div>
  ) : null;

  return (
    <div className="mt-4 rounded-lg bg-surface-50 p-3 dark:bg-surface-900/30" aria-hidden="true">
      <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">Preview</p>
      <div
        className={`flex items-start gap-3 rounded-lg border border-surface-300 bg-white pr-3 pl-3 shadow-xs dark:border-surface-700 dark:bg-surface-800 ${
          isCompact ? 'py-2' : 'py-3'
        }`}
      >
        {/* checkbox */}
        <div className="mt-0.5 shrink-0">
          <span className="flex h-5 w-5 rounded-sm border-2 border-surface-400 dark:border-surface-600" />
        </div>

        <div className="min-w-0 flex-1">
          {isCompact ? (
            <>
              <div className="truncate font-medium text-sm text-surface-800 leading-5 dark:text-surface-200">
                Plan weekend errands
              </div>
              {badgeRow}
            </>
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

        <ChevronRight className="h-5 w-5 shrink-0 text-surface-500 dark:text-surface-400" />
      </div>
    </div>
  );
};
