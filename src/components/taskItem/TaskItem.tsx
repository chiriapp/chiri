import type { AnimateLayoutChanges } from '@dnd-kit/sortable';
import { defaultAnimateLayoutChanges, useSortable } from '@dnd-kit/sortable';
import ChevronRight from 'lucide-react/icons/chevron-right';
import { type CSSProperties, type MouseEvent, useEffect, useRef, useState } from 'react';
import { RepeatModal } from '$components/modals/RepeatModal/RepeatModal';
import { TaskItemBadges } from '$components/taskItem/TaskItemBadges';
import { TaskItemCheckbox } from '$components/taskItem/TaskItemCheckbox';
import { TaskItemContextMenu } from '$components/taskItem/TaskItemContextMenu';
import { TaskItemTitle } from '$components/taskItem/TaskItemTitle';
import { getPriorityColor, getPriorityRingColor } from '$constants/priority';
import { useSettingsStore } from '$context/settingsContext';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useToggleTaskComplete, useUpdateTask } from '$hooks/queries/useTasks';
import {
  useSetActiveAccount,
  useSetActiveCalendar,
  useSetActiveTag,
  useUIState,
} from '$hooks/queries/useUIState';
import { useContextMenu } from '$hooks/ui/useContextMenu';
import { useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import { refreshStaleCursorAfterLayoutAtEventPoint } from '$hooks/ui/useStaleCursorReset';
import { filterCalDavDescription } from '$lib/ical/vtodo';
import { toggleTaskCollapsed } from '$lib/store/tasks';
import type { Account, Task } from '$types';
import { getContrastTextColor } from '$utils/color';
import { getSortableItemDisabled, getSortableItemId } from '$utils/sortable';

// moved outside component. does not close over any component state
const animateLayoutChanges: AnimateLayoutChanges = (args) => {
  const { isSorting, wasDragging } = args;
  if (wasDragging || !isSorting) return false;
  return defaultAnimateLayoutChanges(args);
};

const BADGE_VIEW_SWITCH_CURSOR_RESET_DELAY_FRAMES = 4;

interface TaskItemProps {
  task: Task;
  depth: number;
  ancestorIds: string[];
  isDragEnabled: boolean;
  isOverlay?: boolean;
  isMultiSelected?: boolean;
  isSelectionMode?: boolean;
  onTaskClick?: (task: Task, e: MouseEvent) => void;
  onSelectionCheckboxClick?: (task: Task, e: MouseEvent) => void;
  onTaskContextMenu?: (task: Task, e: MouseEvent) => void;
}

const getBackgroundClass = (
  isMultiSelected: boolean,
  isOverlay: boolean | undefined,
  contextMenu: unknown,
) => {
  if (isMultiSelected && !isOverlay) return 'bg-surface-100 dark:bg-surface-700';
  if (contextMenu && !isOverlay) return 'bg-surface-100 dark:bg-surface-700/60';
  return 'bg-white dark:bg-surface-800';
};

const getBorderClass = (isVisuallySelected: boolean, priority: Task['priority']) => {
  if (isVisuallySelected) return '';
  if (priority === 'none') return 'border-surface-200 dark:border-surface-700';
  return '';
};

const getOpacityClass = (status: Task['status'], isUnstarted: boolean) => {
  if (status === 'completed' || status === 'cancelled') return 'opacity-60';
  if (isUnstarted) return 'opacity-70';
  return '';
};

const getSelectionClass = (
  isSelected: boolean,
  isMultiSelected: boolean,
  priority: Task['priority'],
) => {
  if (isMultiSelected)
    return 'border-surface-400 dark:border-surface-500 ring-1 ring-surface-300 dark:ring-surface-600';
  if (isSelected) return `border-transparent ${getPriorityRingColor(priority)}`;
  return '';
};

export const TaskItem = ({
  task,
  depth,
  ancestorIds,
  isDragEnabled,
  isOverlay,
  isMultiSelected = false,
  isSelectionMode = false,
  onTaskClick,
  onSelectionCheckboxClick,
  onTaskContextMenu,
}: TaskItemProps) => {
  const { data: uiState } = useUIState();
  const { data: accounts = [] } = useAccounts();
  const toggleTaskCompleteMutation = useToggleTaskComplete();
  const updateTaskMutation = useUpdateTask();
  const setActiveTagMutation = useSetActiveTag();
  const setActiveCalendarMutation = useSetActiveCalendar();
  const setActiveAccountMutation = useSetActiveAccount();
  const { taskListDensity, taskBadgeVisibility, taskBadgeOrder, useAccentColorForCheckboxes } =
    useSettingsStore();
  const resolvedAccentColor = useResolvedAccentColor();
  const { contextMenu, handleContextMenu, handleCloseContextMenu, setContextMenu } =
    useContextMenu();

  // ref for the task element to manage focus
  const taskElementRef = useRef<HTMLDivElement>(null);

  const selectedTaskId = uiState?.selectedTaskId ?? null;
  const activeCalendarId = uiState?.activeCalendarId ?? null;
  const activeTagId = uiState?.activeTagId ?? null;
  const showCompletedTasks = uiState?.showCompletedTasks ?? true;
  const isSelected = selectedTaskId === task.id;
  const isVisuallySelected = isSelected || isMultiSelected;

  // focus the task element when it becomes selected via keyboard navigation
  useEffect(() => {
    if (
      isSelected &&
      !isMultiSelected &&
      !isOverlay &&
      document.activeElement !== taskElementRef.current
    ) {
      taskElementRef.current?.focus();
    }
  }, [isSelected, isMultiSelected, isOverlay]);

  const checkmarkColor = getContrastTextColor(resolvedAccentColor);

  const sortableId = getSortableItemId(task.id, isOverlay);
  const sortableDisabled = getSortableItemDisabled(isDragEnabled, isOverlay);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: sortableId,
    disabled: sortableDisabled,
    data: { ancestorIds },
    animateLayoutChanges,
  });

  const mergedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    taskElementRef.current = node;
  };

  // disable all transitions - items will snap to positions immediately
  // prevents the "jumping" animation when drag ends and displaced items return to their natural positions
  const style: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition: 'none',
    opacity: isDragging ? 0 : undefined,
    pointerEvents: isDragging ? 'none' : undefined,
  };

  const isUnstarted = !!(task.startDate && new Date(task.startDate) > new Date());

  const handleClick = (e: MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('.task-checkbox-wrapper') ||
      (e.target as HTMLElement).closest('.collapse-button')
    ) {
      return;
    }

    onTaskClick?.(task, e);
  };

  const handleTaskContextMenu = (e: MouseEvent) => {
    onTaskContextMenu?.(task, e);
    handleContextMenu(e);
  };

  const [flashComplete, setFlashComplete] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCheckboxClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (isSelectionMode) {
      onSelectionCheckboxClick?.(task, e);
      return;
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      onTaskClick?.(task, e);
      return;
    }
    if (task.deletedAt) return;
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

  const handleToggleCollapsed = (e: MouseEvent) => {
    e.stopPropagation();
    toggleTaskCollapsed(task.id);
  };

  const resetStaleBadgeCursor = (event: MouseEvent) => {
    // WebKit can keep a badge's pointer cursor after switching to the tag/calendar view
    refreshStaleCursorAfterLayoutAtEventPoint(event, {
      delayFrames: BADGE_VIEW_SWITCH_CURSOR_RESET_DELAY_FRAMES,
    });
  };

  const handleTagClick = (tagId: string, event: MouseEvent) => {
    resetStaleBadgeCursor(event);
    setActiveTagMutation.mutate(tagId);
  };

  const handleCalendarClick = (calendarId: string, event: MouseEvent) => {
    resetStaleBadgeCursor(event);
    const account = accounts.find((a: Account) => a.calendars.some((c) => c.id === calendarId));
    if (account) setActiveAccountMutation.mutate(account.id);
    setActiveCalendarMutation.mutate(calendarId);
  };

  const marginLeft = depth * 24;
  const paddingLeft = 12 + depth * 4;

  const containerClass = [
    'group relative flex items-start gap-3 pr-3 rounded-lg border transition-all outline-hidden',
    'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-900',
    taskListDensity === 'compact' ? 'py-2' : 'py-3',
    getBackgroundClass(isMultiSelected, isOverlay, contextMenu),
    isOverlay ? 'shadow-xl' : 'shadow-xs hover:shadow-md',
    getBorderClass(isVisuallySelected, task.priority),
    getOpacityClass(task.status, isUnstarted),
    isDragging ? 'cursor-grabbing' : 'cursor-pointer',
    !isOverlay ? 'hover:bg-surface-50 dark:hover:bg-surface-800/70' : '',
    getSelectionClass(isSelected, isMultiSelected, task.priority),
    getPriorityColor(task.priority),
  ].join(' ');

  const badgesProps = {
    task,
    accounts,
    activeCalendarId,
    activeTagId,
    showCompletedTasks,
    onTagClick: handleTagClick,
    onCalendarClick: handleCalendarClick,
    onRepeatClick:
      !task.deletedAt && !isOverlay
        ? (event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            setShowRepeatModal(true);
          }
        : undefined,
    onToggleCollapsed: handleToggleCollapsed,
    badgeVisibility: taskBadgeVisibility,
    badgeOrder: taskBadgeOrder,
  };

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: Task item div contains complex drag-drop layout that button element can't support */}
      <div
        ref={mergedRef}
        style={{ ...style, marginLeft: `${marginLeft}px`, paddingLeft: `${paddingLeft}px` }}
        {...attributes}
        {...(isDragEnabled ? listeners : {})}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick(e as unknown as MouseEvent)}
        onContextMenu={handleTaskContextMenu}
        role="button"
        aria-pressed={isVisuallySelected}
        tabIndex={0}
        data-context-menu
        className={containerClass}
      >
        <div className="task-checkbox-wrapper shrink-0">
          <TaskItemCheckbox
            status={task.status}
            flashComplete={flashComplete}
            checkmarkColor={checkmarkColor}
            useAccentColor={useAccentColorForCheckboxes}
            onClick={handleCheckboxClick}
            disabled={!!task.deletedAt}
            nativeDisabled={!!task.deletedAt && !onTaskClick}
            selectionMode={isSelectionMode}
            selected={isMultiSelected}
          />
        </div>

        <div className="min-w-0 flex-1">
          {taskListDensity === 'compact' ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                <TaskItemTitle
                  title={task.title}
                  status={task.status}
                  isUnstarted={isUnstarted}
                  isSubtask={!!task.parentUid}
                  className="min-w-0 shrink truncate font-medium text-sm"
                />
                <TaskItemBadges {...badgesProps} compact={true} />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <TaskItemTitle
                  title={task.title}
                  status={task.status}
                  isUnstarted={isUnstarted}
                  isSubtask={!!task.parentUid}
                  className="min-w-0 flex-1 truncate font-medium text-sm leading-5"
                />
              </div>

              {filterCalDavDescription(task.description) && (
                <div
                  className={`mt-1 line-clamp-1 text-xs ${task.status === 'completed' || task.status === 'cancelled' ? 'text-surface-400 dark:text-surface-500' : 'text-surface-500 dark:text-surface-400'}`}
                >
                  {filterCalDavDescription(task.description)}
                </div>
              )}
              <TaskItemBadges {...badgesProps} compact={false} />
            </>
          )}
        </div>

        <ChevronRight className="h-5 w-5 shrink-0 text-surface-300 transition-colors group-hover:text-surface-500 dark:text-surface-600 dark:group-hover:text-surface-400" />
      </div>

      {contextMenu && (
        <TaskItemContextMenu
          task={task}
          contextMenu={contextMenu}
          onClose={handleCloseContextMenu}
          setContextMenu={setContextMenu}
        />
      )}

      {showRepeatModal && (
        <RepeatModal
          isOpen={showRepeatModal}
          onClose={() => setShowRepeatModal(false)}
          rrule={task.rrule}
          repeatFrom={task.repeatFrom ?? 0}
          dueDate={task.dueDate ? new Date(task.dueDate) : undefined}
          onSave={(rrule, repeatFrom) =>
            updateTaskMutation.mutate({ id: task.id, updates: { rrule, repeatFrom } })
          }
        />
      )}
    </>
  );
};
