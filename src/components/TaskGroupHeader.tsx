import CalendarSearch from 'lucide-react/icons/calendar-search';
import ChevronDown from 'lucide-react/icons/chevron-down';
import type { MouseEvent } from 'react';
import { Tooltip } from '$components/Tooltip';
import { useSetActiveAccount, useSetActiveCalendar } from '$hooks/queries/useUIState';
import type { VisibleTaskGroup } from '$hooks/queries/useVisibleTasks';
import { pluralize } from '$utils/misc';

interface TaskGroupHeaderProps {
  group: VisibleTaskGroup;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

export const TaskGroupHeader = ({
  group,
  isCollapsed,
  onToggleCollapsed,
}: TaskGroupHeaderProps) => {
  const setActiveAccountMutation = useSetActiveAccount();
  const setActiveCalendarMutation = useSetActiveCalendar();
  const taskCount = group.tasks.length;
  const calendarId = group.key.startsWith('calendar:')
    ? group.key.slice('calendar:'.length)
    : undefined;
  const calendarTask = calendarId
    ? group.tasks.find((task) => task.calendarId === calendarId)
    : undefined;

  const handleCalendarFilterClick = (event: MouseEvent) => {
    event.stopPropagation();
    if (!calendarId || calendarId === 'unknown' || !calendarTask) return;
    setActiveAccountMutation.mutate(calendarTask.accountId);
    setActiveCalendarMutation.mutate(calendarId);
  };

  return (
    <div className="group flex w-full items-center gap-1 rounded pb-1">
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-expanded={!isCollapsed}
        className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 text-left outline-hidden hover:text-surface-900 focus-visible:ring-2 focus-visible:ring-primary-ink dark:hover:text-surface-100"
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-surface-500 transition-transform dark:text-surface-400 ${isCollapsed ? '-rotate-90' : ''}`}
        />
        <span className="truncate font-medium text-sm text-surface-600 dark:text-surface-400">
          {group.label}
        </span>
        <span className="shrink-0 text-surface-500 text-xs dark:text-surface-500">
          {taskCount} {pluralize(taskCount, 'task')}
        </span>
      </button>
      {calendarId && calendarId !== 'unknown' && calendarTask && (
        <Tooltip content="Go to this calendar" position="top" allowInModal>
          <button
            type="button"
            onClick={handleCalendarFilterClick}
            aria-label={`Go to ${group.label}`}
            className="flex size-7 shrink-0 items-center justify-center rounded text-surface-500 opacity-0 outline-hidden transition-opacity hover:bg-surface-100 hover:text-surface-700 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset group-hover:opacity-100 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-200"
          >
            <CalendarSearch className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      )}
    </div>
  );
};
