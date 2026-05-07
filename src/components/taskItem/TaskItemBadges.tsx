import { Fragment } from 'react';
import { TaskItemCalendarBadge } from '$components/taskItem/badges/TaskItemCalendarBadge';
import { TaskItemCollapseButtonBadge } from '$components/taskItem/badges/TaskItemCollapseButtonBadge';
import { TaskItemDueDateBadge } from '$components/taskItem/badges/TaskItemDueDateBadge';
import { TaskItemHiddenSubtasksBadge } from '$components/taskItem/badges/TaskItemHiddenSubtasksBadge';
import { TaskItemInProgressBadge } from '$components/taskItem/badges/TaskItemInProgressBadge';
import { TaskItemRepeatBadge } from '$components/taskItem/badges/TaskItemRepeatBadge';
import { TaskItemStartDateBadge } from '$components/taskItem/badges/TaskItemStartDateBadge';
import { TaskItemSubtaskProgressBadge } from '$components/taskItem/badges/TaskItemSubtaskProgressBadge';
import { TaskItemTagBadge } from '$components/taskItem/badges/TaskItemTagBadge';
import { TaskItemURLBadge } from '$components/taskItem/badges/TaskItemURLBadge';
import { getFallbackItemColor } from '$constants/colorSchemes';
import { getAllTags } from '$lib/store/tags';
import { countChildren, getChildTasks } from '$lib/store/tasks';
import type { Account, Tag, Task } from '$types';
import type { TaskBadgeKey, TaskBadgeVisibility } from '$types/settings';
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
  badgeVisibility: TaskBadgeVisibility;
  badgeOrder: TaskBadgeKey[];
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
  badgeOrder,
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
  const calendarColor = calendar?.color ?? getFallbackItemColor();
  const showCalendar = activeCalendarId === null && calendar;
  const isUnstarted = task.startDate && new Date(task.startDate) > new Date();
  const startDateDisplay = isUnstarted && task.startDate ? formatStartDate(task.startDate) : null;
  const taskTags = (task.tags || [])
    .map((tagId) => getAllTags().find((t) => t.id === tagId))
    .filter((tag): tag is Tag => !!tag);

  const hasAnyVisibleBadge =
    (badgeVisibility.startDate && startDateDisplay) ||
    (badgeVisibility.dueDate && task.dueDate) ||
    (badgeVisibility.tags && taskTags.length > 0) ||
    (badgeVisibility.calendar && showCalendar) ||
    (badgeVisibility.url && task.url) ||
    (badgeVisibility.status && task.status === 'in-process') ||
    (badgeVisibility.subtasks && (totalSubtasks > 0 || childCount > 0));

  if (!hasAnyVisibleBadge) {
    return null;
  }

  const badgeRenderers: Record<TaskBadgeKey, () => React.ReactNode> = {
    startDate: () =>
      badgeVisibility.startDate && startDateDisplay ? (
        <TaskItemStartDateBadge startDateDisplay={startDateDisplay} />
      ) : null,
    dueDate: () =>
      badgeVisibility.dueDate ? <TaskItemDueDateBadge dueDate={task.dueDate} /> : null,
    tags: () =>
      badgeVisibility.tags
        ? taskTags.map((tag) => <TaskItemTagBadge key={tag.id} tag={tag} onTagClick={onTagClick} />)
        : null,
    calendar: () =>
      badgeVisibility.calendar && showCalendar && calendar ? (
        <TaskItemCalendarBadge
          calendar={calendar}
          calendarColor={calendarColor}
          onCalendarClick={onCalendarClick}
        />
      ) : null,
    url: () => (badgeVisibility.url && task.url ? <TaskItemURLBadge url={task.url} /> : null),
    status: () =>
      badgeVisibility.status && task.status === 'in-process' ? (
        <TaskItemInProgressBadge percentComplete={task.percentComplete} />
      ) : null,
    repeat: () => (badgeVisibility.repeat && task.rrule ? <TaskItemRepeatBadge /> : null),
    subtasks: () =>
      badgeVisibility.subtasks ? (
        <>
          {totalSubtasks > 0 && (
            <TaskItemSubtaskProgressBadge completed={completedSubtasks} total={totalSubtasks} />
          )}
          {childCount > 0 && (
            <TaskItemCollapseButtonBadge
              isCollapsed={!!task.isCollapsed}
              childCount={childCount}
              onToggleCollapsed={onToggleCollapsed}
            />
          )}
          {hiddenChildCount > 0 && <TaskItemHiddenSubtasksBadge count={hiddenChildCount} />}
        </>
      ) : null,
  };

  return (
    <div
      className={`flex items-center gap-2 ${compact ? 'overflow-hidden shrink-0' : 'mt-2 flex-wrap'}`}
    >
      {badgeOrder.map((badgeKey) => (
        <Fragment key={badgeKey}>{badgeRenderers[badgeKey]()}</Fragment>
      ))}
    </div>
  );
};
