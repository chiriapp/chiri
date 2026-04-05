import type { AnimateLayoutChanges } from '@dnd-kit/sortable';
import { defaultAnimateLayoutChanges, useSortable } from '@dnd-kit/sortable';
import ChevronRight from 'lucide-react/icons/chevron-right';
import { useEffect, useRef, useState } from 'react';
import { TaskItemDueDateBadge } from '$components/taskItem/badges/TaskItemDueDateBadge';
import { TaskItemBadges } from '$components/taskItem/TaskItemBadges';
import { TaskItemCheckbox } from '$components/taskItem/TaskItemCheckbox';
import { TaskItemContextMenu } from '$components/taskItem/TaskItemContextMenu';
import { TaskItemTitle } from '$components/taskItem/TaskItemTitle';
import { getPriorityColor, getPriorityRingColor } from '$constants/priority';
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
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { useContextMenu } from '$hooks/ui/useContextMenu';
import { filterCalDavDescription } from '$lib/ical/vtodo';
import { toggleTaskCollapsed } from '$lib/store/tasks';
import type { Account, Task } from '$types';
import { getContrastTextColor } from '$utils/color';

// Moved outside component — does not close over any component state
const animateLayoutChanges: AnimateLayoutChanges = (args) => {
  const { isSorting, wasDragging } = args;
  if (wasDragging || !isSorting) return false;
  return defaultAnimateLayoutChanges(args);
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
    if (isSelected && !isOverlay && document.activeElement !== taskElementRef.current) {
      taskElementRef.current?.focus();
    }
  }, [isSelected, isOverlay]);

  const checkmarkColor = getContrastTextColor(accentColor);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: task.id,
    disabled: !isDragEnabled,
    data: { ancestorIds },
    animateLayoutChanges,
  });

  const mergedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    taskElementRef.current = node;
  };

  // Disable all transitions - items will snap to positions immediately.
  // Prevents the "jumping" animation when drag ends and displaced items return to their natural positions.
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition: 'none',
    opacity: isDragging ? 0 : undefined,
    pointerEvents: isDragging ? 'none' : undefined,
  };

  const isUnstarted = !!(task.startDate && new Date(task.startDate) > new Date());

  const handleClick = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('.task-checkbox-wrapper') ||
      (e.target as HTMLElement).closest('.collapse-button')
    ) {
      return;
    }

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

  const handleCalendarClick = (calendarId: string) => {
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
    contextMenu && !isOverlay
      ? 'bg-surface-100 dark:bg-surface-700/60'
      : 'bg-white dark:bg-surface-800',
    isOverlay ? 'shadow-xl' : 'shadow-xs hover:shadow-md',
    isSelected ? '' : task.priority === 'none' ? 'border-surface-200 dark:border-surface-700' : '',
    task.status === 'completed' || task.status === 'cancelled'
      ? 'opacity-60'
      : isUnstarted
        ? 'opacity-70'
        : '',
    isDragEnabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
    !isOverlay ? 'hover:bg-surface-50 dark:hover:bg-surface-800/70' : '',
    isSelected && `border-transparent ${getPriorityRingColor(task.priority)}`,
    getPriorityColor(task.priority),
  ].join(' ');

  const badgesProps = {
    task,
    accounts,
    activeCalendarId,
    showCompletedTasks,
    onTagClick: (tagId: string) => setActiveTagMutation.mutate(tagId),
    onCalendarClick: handleCalendarClick,
    onToggleCollapsed: handleToggleCollapsed,
    badgeVisibility: taskBadgeVisibility,
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
        onKeyDown={(e) => e.key === 'Enter' && handleClick(e as unknown as React.MouseEvent)}
        onContextMenu={handleContextMenu}
        role="button"
        tabIndex={0}
        data-context-menu
        className={containerClass}
      >
        <div className="task-checkbox-wrapper shrink-0">
          <TaskItemCheckbox
            status={task.status}
            flashComplete={flashComplete}
            checkmarkColor={checkmarkColor}
            onClick={handleCheckboxClick}
          />
        </div>

        <div className="flex-1 min-w-0">
          {taskListDensity === 'compact' ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                <TaskItemTitle
                  title={task.title}
                  status={task.status}
                  isUnstarted={isUnstarted}
                  className="text-sm font-medium truncate shrink min-w-0"
                />
                <TaskItemBadges {...badgesProps} compact={true} />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {taskBadgeVisibility.dueDate && <TaskItemDueDateBadge dueDate={task.dueDate} />}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <TaskItemTitle
                  title={task.title}
                  status={task.status}
                  isUnstarted={isUnstarted}
                  className="text-sm font-medium leading-5 truncate flex-1 min-w-0"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <TaskItemDueDateBadge dueDate={task.dueDate} />
                </div>
              </div>

              {filterCalDavDescription(task.description) && (
                <div
                  className={`text-xs mt-1 line-clamp-1 ${task.status === 'completed' || task.status === 'cancelled' ? 'text-surface-400 dark:text-surface-500' : 'text-surface-500 dark:text-surface-400'}`}
                >
                  {filterCalDavDescription(task.description)}
                </div>
              )}
              <TaskItemBadges {...badgesProps} compact={false} />
            </>
          )}
        </div>

        <ChevronRight className="w-5 h-5 text-surface-300 dark:text-surface-600 group-hover:text-surface-500 dark:group-hover:text-surface-400 transition-colors shrink-0" />
      </div>

      {contextMenu && (
        <TaskItemContextMenu
          task={task}
          contextMenu={contextMenu}
          onClose={handleCloseContextMenu}
          setContextMenu={setContextMenu}
        />
      )}
    </>
  );
};
