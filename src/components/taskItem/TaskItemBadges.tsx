import { Fragment, type MouseEvent, type ReactNode, useSyncExternalStore } from 'react';
import { TaskItemCalendarBadge } from '$components/taskItem/badges/TaskItemCalendarBadge';
import { TaskItemCollapseButtonBadge } from '$components/taskItem/badges/TaskItemCollapseButtonBadge';
import { TaskItemDueDateBadge } from '$components/taskItem/badges/TaskItemDueDateBadge';
import { TaskItemHiddenSubtasksBadge } from '$components/taskItem/badges/TaskItemHiddenSubtasksBadge';
import { TaskItemInProgressBadge } from '$components/taskItem/badges/TaskItemInProgressBadge';
import { TaskItemRepeatBadge } from '$components/taskItem/badges/TaskItemRepeatBadge';
import { TaskItemSnoozedBadge } from '$components/taskItem/badges/TaskItemSnoozedBadge';
import { TaskItemStartDateBadge } from '$components/taskItem/badges/TaskItemStartDateBadge';
import { TaskItemSubtaskProgressBadge } from '$components/taskItem/badges/TaskItemSubtaskProgressBadge';
import { TaskItemTagBadge } from '$components/taskItem/badges/TaskItemTagBadge';
import { TaskItemURLBadge } from '$components/taskItem/badges/TaskItemURLBadge';
import { useSettingsStore } from '$context/settingsContext';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import { getSnoozedUntil, subscribeToSnoozes } from '$lib/notifications/snoozes';
import { getAllTags } from '$lib/store/tags';
import { getChildTasks } from '$lib/store/tasks';
import type { Account, Tag, Task } from '$types';
import type { TaskBadgeKey, TaskBadgeVisibility } from '$types/settings';
import { formatStartDate } from '$utils/date';

interface TaskItemBadgesProps {
  task: Task;
  accounts: Account[];
  activeCalendarId: string | null;
  activeTagId: string | null;
  showCompletedTasks: boolean;
  onTagClick: (tagId: string, event: MouseEvent) => void;
  onCalendarClick: (calendarId: string, event: MouseEvent) => void;
  onRepeatClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onToggleCollapsed: (e: MouseEvent) => void;
  compact: boolean;
  badgeVisibility: TaskBadgeVisibility;
  badgeOrder: TaskBadgeKey[];
}

export const TaskItemBadges = ({
  task,
  accounts,
  activeCalendarId,
  activeTagId,
  showCompletedTasks,
  onTagClick,
  onCalendarClick,
  onRepeatClick,
  onToggleCollapsed,
  compact,
  badgeVisibility,
  badgeOrder,
}: TaskItemBadgesProps) => {
  const { dateFormat } = useSettingsStore();
  const resolveAccent = useAccentColorResolver();
  const resolvedAccentColor = useResolvedAccentColor();
  const childTaskFilter = task.deletedAt ? 'deleted' : 'active';
  const allChildTasks = getChildTasks(task.uid, childTaskFilter);
  const hiddenChildCount = !showCompletedTasks
    ? allChildTasks.filter((c) => c.status === 'completed' || c.status === 'cancelled').length
    : 0;
  const completedSubtasks = allChildTasks.filter(
    (s) => s.status === 'completed' || s.status === 'cancelled',
  ).length;
  const totalSubtasks = allChildTasks.length;
  const childCount = allChildTasks.length;
  const allCalendars = accounts.flatMap((a) => a.calendars);
  const calendar = allCalendars.find((c) => c.id === task.calendarId);
  const calendarColor = calendar?.color ? resolveAccent(calendar.color) : resolvedAccentColor;
  const showCalendar = activeCalendarId === null && calendar;
  const isUnstarted = task.startDate && new Date(task.startDate) > new Date();
  const startDateDisplay = isUnstarted && task.startDate ? formatStartDate(task.startDate) : null;
  const taskTags = (task.tags || [])
    .map((tagId) => getAllTags().find((t) => t.id === tagId))
    .filter((tag): tag is Tag => !!tag && tag.id !== activeTagId);
  const isSnoozed = useSyncExternalStore(
    subscribeToSnoozes,
    () => getSnoozedUntil(task.id) !== undefined,
    () => getSnoozedUntil(task.id) !== undefined,
  );

  const hasAnyVisibleBadge =
    (badgeVisibility.startDate && startDateDisplay) ||
    (badgeVisibility.dueDate && task.dueDate) ||
    (badgeVisibility.tags && taskTags.length > 0) ||
    (badgeVisibility.calendar && showCalendar) ||
    (badgeVisibility.url && task.url) ||
    (badgeVisibility.status && task.status === 'in-process') ||
    (badgeVisibility.repeat && task.rrule) ||
    (badgeVisibility.subtasks && (totalSubtasks > 0 || childCount > 0)) ||
    (badgeVisibility.snooze && isSnoozed);

  if (!hasAnyVisibleBadge) {
    return null;
  }

  const badgeRenderers: Record<TaskBadgeKey, () => ReactNode> = {
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
          readOnly={!!task.deletedAt}
        />
      ) : null,
    url: () => (badgeVisibility.url && task.url ? <TaskItemURLBadge url={task.url} /> : null),
    status: () =>
      badgeVisibility.status && task.status === 'in-process' ? (
        <TaskItemInProgressBadge percentComplete={task.percentComplete} />
      ) : null,
    snooze: () => (badgeVisibility.snooze ? <TaskItemSnoozedBadge taskId={task.id} /> : null),
    repeat: () =>
      badgeVisibility.repeat && task.rrule ? (
        <TaskItemRepeatBadge
          rrule={task.rrule}
          repeatFrom={task.repeatFrom}
          dateFormat={dateFormat}
          onClick={onRepeatClick}
        />
      ) : null,
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
      className={`flex items-center gap-2 ${compact ? 'shrink-0 overflow-hidden' : 'mt-2 flex-wrap'}`}
    >
      {badgeOrder.map((badgeKey) => (
        <Fragment key={badgeKey}>{badgeRenderers[badgeKey]()}</Fragment>
      ))}
    </div>
  );
};
