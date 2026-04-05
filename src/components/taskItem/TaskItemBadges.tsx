import { TaskItemCalendarBadge } from '$components/taskItem/TaskItemCalendarBadge';
import { TaskItemCollapseButton } from '$components/taskItem/TaskItemCollapseButton';
import { TaskItemHiddenSubtasksBadge } from '$components/taskItem/TaskItemHiddenSubtasksBadge';
import { TaskItemInProgressBadge } from '$components/taskItem/TaskItemInProgressBadge';
import { TaskItemRepeatBadge } from '$components/taskItem/TaskItemRepeatBadge';
import { TaskItemStartDateBadge } from '$components/taskItem/TaskItemStartDateBadge';
import { TaskItemSubtaskProgressBadge } from '$components/taskItem/TaskItemSubtaskProgressBadge';
import { TaskItemTagBadge } from '$components/taskItem/TaskItemTagBadge';
import { TaskItemURLBadge } from '$components/taskItem/TaskItemURLBadge';
import { FALLBACK_ITEM_COLOR } from '$constants';
import { getAllTags } from '$lib/store/tags';
import { countChildren, getChildTasks } from '$lib/store/tasks';
import type { Account, Tag, Task } from '$types';
import { formatStartDate } from '$utils/date';

interface TaskItemBadgesProps {
  task: Task;
  accounts: Account[];
  activeCalendarId: string | null;
  showCompletedTasks: boolean;
  onTagClick: (tagId: string) => void;
  onCalendarClick: (calendarId: string) => void;
  onToggleCollapsed: (e: React.MouseEvent) => void;
  compact: boolean;
  badgeVisibility: {
    startDate: boolean;
    dueDate: boolean;
    tags: boolean;
    calendar: boolean;
    url: boolean;
    status: boolean;
    repeat: boolean;
    subtasks: boolean;
  };
}

export const TaskItemBadges = ({
  task,
  accounts,
  activeCalendarId,
  showCompletedTasks,
  onTagClick,
  onCalendarClick,
  onToggleCollapsed,
  compact,
  badgeVisibility,
}: TaskItemBadgesProps) => {
  const allChildTasks = getChildTasks(task.uid);
  const hiddenChildCount = !showCompletedTasks
    ? allChildTasks.filter((c) => c.status === 'completed' || c.status === 'cancelled').length
    : 0;
  const completedSubtasks = allChildTasks.filter(
    (s) => s.status === 'completed' || s.status === 'cancelled',
  ).length;
  const totalSubtasks = allChildTasks.length;
  const childCount = countChildren(task.uid);
  const allCalendars = accounts.flatMap((a) => a.calendars);
  const calendar = allCalendars.find((c) => c.id === task.calendarId);
  const calendarColor = calendar?.color ?? FALLBACK_ITEM_COLOR;
  const showCalendar = activeCalendarId === null && calendar;
  const isUnstarted = task.startDate && new Date(task.startDate) > new Date();
  const startDateDisplay = isUnstarted && task.startDate ? formatStartDate(task.startDate) : null;
  const taskTags = (task.tags || [])
    .map((tagId) => getAllTags().find((t) => t.id === tagId))
    .filter((tag): tag is Tag => !!tag);

  const hasAnyVisibleBadge =
    (badgeVisibility.startDate && startDateDisplay) ||
    (badgeVisibility.tags && taskTags.length > 0) ||
    (badgeVisibility.calendar && showCalendar) ||
    (badgeVisibility.url && task.url) ||
    (badgeVisibility.status && task.status === 'in-process') ||
    (badgeVisibility.subtasks && (totalSubtasks > 0 || childCount > 0));

  if (!hasAnyVisibleBadge) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2 ${compact ? 'overflow-hidden shrink-0' : 'mt-2 flex-wrap'}`}
    >
      {badgeVisibility.startDate && startDateDisplay && (
        <TaskItemStartDateBadge startDateDisplay={startDateDisplay} />
      )}

      {badgeVisibility.tags &&
        taskTags.map((tag) => <TaskItemTagBadge key={tag.id} tag={tag} onTagClick={onTagClick} />)}

      {badgeVisibility.calendar && showCalendar && calendar && (
        <TaskItemCalendarBadge
          calendar={calendar}
          calendarColor={calendarColor}
          onCalendarClick={onCalendarClick}
        />
      )}

      {badgeVisibility.url && task.url && <TaskItemURLBadge url={task.url} />}

      {badgeVisibility.status && task.status === 'in-process' && (
        <TaskItemInProgressBadge percentComplete={task.percentComplete} />
      )}

      {badgeVisibility.repeat && task.rrule && <TaskItemRepeatBadge />}

      {badgeVisibility.subtasks && totalSubtasks > 0 && (
        <TaskItemSubtaskProgressBadge completed={completedSubtasks} total={totalSubtasks} />
      )}

      {badgeVisibility.subtasks && childCount > 0 && (
        <TaskItemCollapseButton
          isCollapsed={!!task.isCollapsed}
          childCount={childCount}
          onToggleCollapsed={onToggleCollapsed}
        />
      )}

      {badgeVisibility.subtasks && hiddenChildCount > 0 && (
        <TaskItemHiddenSubtasksBadge count={hiddenChildCount} />
      )}
    </div>
  );
};
