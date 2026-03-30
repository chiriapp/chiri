import type { AnimateLayoutChanges } from '@dnd-kit/sortable';
import { defaultAnimateLayoutChanges, useSortable } from '@dnd-kit/sortable';
import { openUrl } from '@tauri-apps/plugin-opener';
import CalendarClock from 'lucide-react/icons/calendar-clock';
import Check from 'lucide-react/icons/check';
import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import ChevronDown from 'lucide-react/icons/chevron-down';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Clock from 'lucide-react/icons/clock';
import Link from 'lucide-react/icons/link';
import Loader from 'lucide-react/icons/loader';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import X from 'lucide-react/icons/x';
import { useEffect, useRef, useState } from 'react';
import { TaskContextMenu } from '$components/TaskContextMenu';
import { getIconByName } from '$data/icons';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useToggleTaskComplete } from '$hooks/queries/useTasks';
import {
  useSetActiveAccount,
  useSetActiveCalendar,
  useSetActiveTag,
  useSetEditorOpen,
  useSetSelectedTask,
  useUIState,
} from '$hooks/queries/useUIState';
import { useContextMenu } from '$hooks/useContextMenu';
import { useSettingsStore } from '$hooks/useSettingsStore';
import { getAllTags } from '$lib/store/tags';
import { countChildren, getChildTasks, toggleTaskCollapsed } from '$lib/store/tasks';
import type { Account, Task } from '$types/index';
import { getContrastTextColor } from '$utils/color';
import { FALLBACK_ITEM_COLOR } from '$utils/constants';
import { formatDueDate, formatStartDate } from '$utils/date';
import { pluralize } from '$utils/format';
import { filterCalDavDescription } from '$utils/ical';
import { getPriorityColor, getPriorityRingColor } from '$utils/priority';

// Moved outside component — does not close over any component state
const animateLayoutChanges: AnimateLayoutChanges = (args) => {
  const { isSorting, wasDragging } = args;
  if (wasDragging || !isSorting) return false;
  return defaultAnimateLayoutChanges(args);
};

interface TaskBadgesRowProps {
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

const TaskBadgesRow = ({
  task,
  accounts,
  activeCalendarId,
  showCompletedTasks,
  onTagClick,
  onCalendarClick,
  onToggleCollapsed,
  compact,
  badgeVisibility,
}: TaskBadgesRowProps) => {
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
    .filter(Boolean);

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

  const CalendarIcon = calendar ? getIconByName(calendar.icon || 'calendar') : null;

  return (
    <div
      className={`flex items-center gap-2 ${compact ? 'overflow-hidden flex-shrink-0' : 'mt-2 flex-wrap'}`}
    >
      {badgeVisibility.startDate && startDateDisplay && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border"
          style={{
            borderColor: startDateDisplay.borderColor,
            backgroundColor: startDateDisplay.bgColor,
            color: startDateDisplay.textColor,
          }}
        >
          <CalendarClock className="w-3 h-3" />
          {startDateDisplay.text}
        </span>
      )}

      {badgeVisibility.tags &&
        taskTags.map((tag) => {
          if (!tag) return null;
          const TagIcon = getIconByName(tag.icon || 'tag');
          return (
            <button
              type="button"
              key={tag.id}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick(tag.id);
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium hover:opacity-80 transition-opacity border outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
              style={{
                borderColor: tag.color,
                backgroundColor: `${tag.color}15`,
                color: tag.color,
              }}
            >
              {tag.emoji ? (
                <span className="text-xs leading-none">{tag.emoji}</span>
              ) : (
                <TagIcon className="w-3 h-3" />
              )}
              {tag.name}
            </button>
          );
        })}

      {badgeVisibility.calendar && showCalendar && calendar && CalendarIcon && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCalendarClick(calendar.id);
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border hover:opacity-80 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          style={{
            borderColor: calendarColor,
            backgroundColor: `${calendarColor}15`,
            color: calendarColor,
          }}
        >
          {calendar.emoji ? (
            <span className="text-xs leading-none">{calendar.emoji}</span>
          ) : (
            <CalendarIcon className="w-3 h-3" />
          )}
          {calendar.displayName || 'Calendar'}
        </button>
      )}

      {badgeVisibility.url && task.url && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openUrl(task.url!);
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:opacity-80 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          title={task.url}
        >
          <Link className="w-3 h-3" />
          URL
        </button>
      )}

      {badgeVisibility.status && task.status === 'in-process' && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border"
          style={{
            borderColor: '#3b82f6',
            backgroundColor: '#3b82f615',
            color: '#3b82f6',
          }}
        >
          <Loader className="w-3 h-3" />
          {task.percentComplete}%
        </span>
      )}

      {badgeVisibility.repeat && task.rrule && (
        <span
          title="Repeating task"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-400"
        >
          <RefreshCw className="w-3 h-3" />
        </span>
      )}

      {badgeVisibility.subtasks && totalSubtasks > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-400">
          <CheckCircle2 className="w-3 h-3" />
          {completedSubtasks}/{totalSubtasks}
        </span>
      )}

      {badgeVisibility.subtasks && childCount > 0 && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="collapse-button inline-flex items-center gap-0.5 px-2 py-0.5 rounded border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors text-xs text-surface-500 dark:text-surface-400 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
        >
          {task.isCollapsed ? (
            <>
              <ChevronRight className="w-3 h-3" />
              <span>
                {childCount} {pluralize(childCount, 'subtask')}
              </span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              <span>
                {childCount} {pluralize(childCount, 'subtask')}
              </span>
            </>
          )}
        </button>
      )}

      {badgeVisibility.subtasks && hiddenChildCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border border-surface-300 dark:border-surface-600 bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400">
          {hiddenChildCount} hidden {pluralize(hiddenChildCount, 'subtask')}
        </span>
      )}
    </div>
  );
};

interface TaskItemProps {
  task: Task;
  depth: number;
  ancestorIds: string[];
  isDragEnabled: boolean;
  isOverlay?: boolean;
}

export const TaskItem = ({ task, depth, ancestorIds, isDragEnabled, isOverlay }: TaskItemProps) => {
  const { data: uiState } = useUIState();
  const { data: accounts = [] } = useAccounts();
  const toggleTaskCompleteMutation = useToggleTaskComplete();
  const setSelectedTaskMutation = useSetSelectedTask();
  const setEditorOpenMutation = useSetEditorOpen();
  const setActiveTagMutation = useSetActiveTag();
  const setActiveCalendarMutation = useSetActiveCalendar();
  const setActiveAccountMutation = useSetActiveAccount();
  const { accentColor, taskListDensity, taskBadgeVisibility } = useSettingsStore();
  const { contextMenu, handleContextMenu, handleCloseContextMenu, setContextMenu } =
    useContextMenu();

  // Ref for the task element to manage focus
  const taskElementRef = useRef<HTMLDivElement>(null);

  const selectedTaskId = uiState?.selectedTaskId ?? null;
  const activeCalendarId = uiState?.activeCalendarId ?? null;
  const showCompletedTasks = uiState?.showCompletedTasks ?? true;
  const isEditorOpen = uiState?.isEditorOpen ?? false;
  const isSelected = selectedTaskId === task.id;

  // Focus the task element when it becomes selected via keyboard navigation
  useEffect(() => {
    if (isSelected && !isOverlay) {
      // Only focus if this element is not already focused
      // This prevents re-focusing when clicking with mouse
      if (document.activeElement !== taskElementRef.current) {
        taskElementRef.current?.focus();
      }
    }
  }, [isSelected, isOverlay]);

  // get contrast color for checkbox checkmark
  const checkmarkColor = getContrastTextColor(accentColor);

  // pass ancestorIds as data so it can be accessed in handleDragEnd
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: task.id,
    disabled: !isDragEnabled,
    data: { ancestorIds },
    animateLayoutChanges,
  });

  // Merge refs: need both sortable's setNodeRef and our taskElementRef for focus management
  const mergedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    taskElementRef.current = node;
  };

  // Disable all transitions - items will snap to positions immediately.
  // This prevents the "jumping" animation when drag ends and displaced items
  // return to their natural positions.
  // Use opacity: 0 instead of visibility: hidden for instant hiding without flash.
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition: 'none',
    opacity: isDragging ? 0 : undefined,
    pointerEvents: isDragging ? 'none' : undefined,
  };

  const dueDateDisplay = task.dueDate ? formatDueDate(task.dueDate) : null;
  const isUnstarted = task.startDate && new Date(task.startDate) > new Date();

  const handleClick = (e: React.MouseEvent) => {
    // don't select if clicking the checkbox or collapse button
    if (
      (e.target as HTMLElement).closest('.task-checkbox-wrapper') ||
      (e.target as HTMLElement).closest('.collapse-button')
    ) {
      return;
    }

    // If the task is already selected and editor is open, close the editor
    if (isSelected && isEditorOpen) {
      setEditorOpenMutation.mutate(false);
      return;
    }

    setSelectedTaskMutation.mutate(task.id);
  };

  const [flashComplete, setFlashComplete] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // For recurring tasks that will advance (not permanently complete), briefly flash
    // the completed state so the user can tell their click registered.
    if (task.rrule && task.status !== 'completed') {
      setFlashComplete(true);
      flashTimerRef.current = setTimeout(() => setFlashComplete(false), 600);
    }
    toggleTaskCompleteMutation.mutate(task.id);
  };

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const handleToggleCollapsed = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTaskCollapsed(task.id);
  };

  // todo: implement duplicate functionality at some point

  // calculate left margin based on depth
  const marginLeft = depth * 24; // 24px per level
  const paddingLeft = 12 + depth * 4;

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: Task item div contains complex drag-drop layout that button element can't support */}
      <div
        ref={mergedRef}
        style={{ ...style, marginLeft: `${marginLeft}px`, paddingLeft: `${paddingLeft}px` }}
        {...attributes}
        {...(isDragEnabled ? listeners : {})}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick(e as unknown as React.MouseEvent)}
        onContextMenu={handleContextMenu}
        role="button"
        tabIndex={0}
        data-context-menu
        className={`
          group relative flex items-start gap-3 pr-3 ${taskListDensity === 'compact' ? 'py-2' : 'py-3'} rounded-lg border transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-900
          ${contextMenu && !isOverlay ? 'bg-surface-100 dark:bg-surface-700/60' : 'bg-white dark:bg-surface-800'}
          ${isOverlay ? 'shadow-xl' : 'shadow-sm hover:shadow-md'}
          ${isSelected ? '' : task.priority === 'none' ? 'border-surface-200 dark:border-surface-700' : ''}
          ${task.status === 'completed' || task.status === 'cancelled' ? 'opacity-60' : isUnstarted ? 'opacity-70' : ''}
          ${isDragEnabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
          ${!isOverlay ? 'hover:bg-surface-50 dark:hover:bg-surface-800/70' : ''}
          ${isSelected && `border-transparent ${getPriorityRingColor(task.priority)}`}
          ${getPriorityColor(task.priority)}
        `}
      >
        <div className="task-checkbox-wrapper flex-shrink-0">
          <button
            type="button"
            onClick={handleCheckboxClick}
            title={
              task.status === 'cancelled'
                ? 'Cancelled'
                : task.status === 'in-process'
                  ? 'In Progress'
                  : task.status === 'completed'
                    ? 'Completed — click to reopen'
                    : 'Mark complete'
            }
            className={`
              w-5 h-5 rounded border-2 flex items-center justify-center transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset
              ${
                task.status === 'completed' || flashComplete
                  ? 'bg-primary-500 border-primary-500'
                  : task.status === 'cancelled'
                    ? 'bg-rose-400 border-rose-400 dark:bg-rose-500 dark:border-rose-500'
                    : task.status === 'in-process'
                      ? 'bg-blue-400 border-blue-400 dark:bg-blue-500 dark:border-blue-500'
                      : 'border-surface-300 dark:border-surface-600 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30'
              }
            `}
          >
            {(task.status === 'completed' || flashComplete) && (
              <Check className="w-4 h-4" style={{ color: checkmarkColor }} strokeWidth={3} />
            )}
            {task.status === 'cancelled' && (
              <X className="w-4 h-4 text-white dark:text-surface-200" strokeWidth={3} />
            )}
            {task.status === 'in-process' && (
              <Loader className="w-4 h-4 text-white dark:text-blue-100" />
            )}
          </button>
        </div>

        <div className="flex-1 min-w-0">
          {taskListDensity === 'compact' ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                <div
                  className={`text-sm font-medium truncate shrink min-w-0 ${
                    task.status === 'completed'
                      ? 'line-through text-surface-400'
                      : task.status === 'cancelled'
                        ? 'line-through text-surface-400 dark:text-surface-500'
                        : isUnstarted
                          ? 'text-surface-500 dark:text-surface-400'
                          : 'text-surface-800 dark:text-surface-200'
                  }`}
                >
                  {task.title || <span className="text-surface-400 italic">Untitled task</span>}
                </div>
                <TaskBadgesRow
                  task={task}
                  accounts={accounts}
                  activeCalendarId={activeCalendarId}
                  showCompletedTasks={showCompletedTasks}
                  onTagClick={(tagId) => setActiveTagMutation.mutate(tagId)}
                  onCalendarClick={(calendarId) => {
                    const account = accounts.find((a) =>
                      a.calendars.some((c) => c.id === calendarId),
                    );
                    if (account) setActiveAccountMutation.mutate(account.id);
                    setActiveCalendarMutation.mutate(calendarId);
                  }}
                  onToggleCollapsed={handleToggleCollapsed}
                  compact={true}
                  badgeVisibility={taskBadgeVisibility}
                />
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {taskBadgeVisibility.dueDate && dueDateDisplay && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${dueDateDisplay.className}`}
                  >
                    <Clock className="w-3 h-3" />
                    {dueDateDisplay.text}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div
                  className={`text-sm font-medium leading-5 truncate flex-1 min-w-0 ${
                    task.status === 'completed'
                      ? 'line-through text-surface-400'
                      : task.status === 'cancelled'
                        ? 'line-through text-surface-400 dark:text-surface-500'
                        : isUnstarted
                          ? 'text-surface-500 dark:text-surface-400'
                          : 'text-surface-800 dark:text-surface-200'
                  }`}
                >
                  {task.title || <span className="text-surface-400 italic">Untitled task</span>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {dueDateDisplay && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${dueDateDisplay.className}`}
                    >
                      <Clock className="w-3 h-3" />
                      {dueDateDisplay.text}
                    </span>
                  )}
                </div>
              </div>
              {filterCalDavDescription(task.description) && (
                <div
                  className={`text-xs mt-1 line-clamp-1 ${task.status === 'completed' || task.status === 'cancelled' ? 'text-surface-400 dark:text-surface-500' : 'text-surface-500 dark:text-surface-400'}`}
                >
                  {filterCalDavDescription(task.description)}
                </div>
              )}
              <TaskBadgesRow
                task={task}
                accounts={accounts}
                activeCalendarId={activeCalendarId}
                showCompletedTasks={showCompletedTasks}
                onTagClick={(tagId) => setActiveTagMutation.mutate(tagId)}
                onCalendarClick={(calendarId) => {
                  const account = accounts.find((a) =>
                    a.calendars.some((c) => c.id === calendarId),
                  );
                  if (account) setActiveAccountMutation.mutate(account.id);
                  setActiveCalendarMutation.mutate(calendarId);
                }}
                onToggleCollapsed={handleToggleCollapsed}
                compact={false}
                badgeVisibility={taskBadgeVisibility}
              />
            </>
          )}
        </div>

        <ChevronRight className="w-5 h-5 text-surface-300 dark:text-surface-600 group-hover:text-surface-500 dark:group-hover:text-surface-400 transition-colors flex-shrink-0" />
      </div>

      {contextMenu && (
        <TaskContextMenu
          task={task}
          contextMenu={contextMenu}
          onClose={handleCloseContextMenu}
          setContextMenu={setContextMenu}
        />
      )}
    </>
  );
};
