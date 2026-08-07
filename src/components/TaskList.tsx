import { closestCenter, DndContext, DragOverlay, type Modifier } from '@dnd-kit/core';
import ArrowRight from 'lucide-react/icons/arrow-right';
import ClipboardPlus from 'lucide-react/icons/clipboard-plus';
import FunnelX from 'lucide-react/icons/funnel-x';
import Plus from 'lucide-react/icons/plus';
import SearchX from 'lucide-react/icons/search-x';
import Trash2 from 'lucide-react/icons/trash-2';
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RecentlyDeletedNoticeBanner } from '$components/banners/RecentlyDeletedNoticeBanner';
import { TaskGroupSection } from '$components/TaskGroupSection';
import { TaskItem } from '$components/taskItem/TaskItem';
import { DEFAULT_SORT_CONFIG, DEFAULT_TASK_GROUP_CONFIG } from '$constants';
import { useCreateTask } from '$hooks/queries/useTasks';
import { useSetSelectedTask, useUIState } from '$hooks/queries/useUIState';
import { useVisibleTaskGroups } from '$hooks/queries/useVisibleTasks';
import { truncateName, useSortableDrag } from '$hooks/ui/useSortableDrag';
import { useTaskListSelection } from '$hooks/ui/useTaskListSelection';
import { getEffectiveTaskGroupConfig } from '$lib/task/grouping';
import type { LucideIcon } from '$types/lucide';
import { getMetaKeyLabel, getModifierJoiner } from '$utils/keyboard';

const getEmptyState = (
  isRecentlyDeleted: boolean,
  isFilterView: boolean,
  isSearching: boolean,
  newTaskShortcut: string,
): { Icon: LucideIcon; title: string; description: ReactNode; showCreateButton: boolean } => {
  if (isRecentlyDeleted) {
    return {
      Icon: Trash2,
      title: isSearching ? 'No deleted tasks found' : 'Recently Deleted is empty',
      description: isSearching
        ? 'Try adjusting your search terms.'
        : 'Deleted tasks will appear here until you restore or permanently delete them.',
      showCreateButton: false,
    };
  }

  if (isSearching) {
    return {
      Icon: SearchX,
      title: 'No tasks found',
      description: 'Try adjusting your search terms.',
      showCreateButton: false,
    };
  }

  if (isFilterView) {
    return {
      Icon: FunnelX,
      title: 'No tasks match this filter',
      description: 'Tasks will appear here when they match this filter.',
      showCreateButton: false,
    };
  }

  return {
    Icon: ClipboardPlus,
    title: 'No tasks yet',
    description: (
      <>
        Click the button below or press{' '}
        <kbd className="rounded-sm bg-surface-100 px-2 py-1 font-mono text-sm dark:bg-surface-700">
          {newTaskShortcut}
        </kbd>{' '}
        to create a new task.
      </>
    ),
    showCreateButton: true,
  };
};

export const TaskList = () => {
  const { data: uiState } = useUIState();
  const visibleTaskGroups = useVisibleTaskGroups();
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<ReadonlySet<string>>(new Set());
  const initializedDefaultGroupKeys = useRef(new Set<string>());
  useEffect(() => {
    const defaults = visibleTaskGroups
      .filter(
        (group) => group.defaultCollapsed && !initializedDefaultGroupKeys.current.has(group.key),
      )
      .map((group) => group.key);
    if (defaults.length === 0) return;

    for (const key of defaults) initializedDefaultGroupKeys.current.add(key);
    setCollapsedGroupKeys((keys) => new Set([...keys, ...defaults]));
  }, [visibleTaskGroups]);
  const displayedTaskGroups = useMemo(
    () => visibleTaskGroups.filter((group) => !collapsedGroupKeys.has(group.key)),
    [collapsedGroupKeys, visibleTaskGroups],
  );
  const flattenedTasks = useMemo(
    () => displayedTaskGroups.flatMap((group) => group.tasks),
    [displayedTaskGroups],
  );
  const createTaskMutation = useCreateTask();
  const setSelectedTaskMutation = useSetSelectedTask();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  const hasNewTaskTitle = newTaskTitle.trim().length > 0;

  const sortConfig = uiState?.sortConfig ?? DEFAULT_SORT_CONFIG;
  const taskGroupConfig = uiState?.taskGroupConfig ?? DEFAULT_TASK_GROUP_CONFIG;
  const activeCalendarId = uiState?.activeCalendarId ?? null;
  const effectiveTaskGroupConfig = getEffectiveTaskGroupConfig(taskGroupConfig, activeCalendarId);
  const searchQuery = uiState?.searchQuery ?? '';
  const activeView = uiState?.activeView ?? 'tasks';
  const taskGroupKeys = useMemo(
    () =>
      new Map(
        displayedTaskGroups.flatMap((group) => group.tasks.map((task) => [task.id, group.key])),
      ),
    [displayedTaskGroups],
  );
  const taskGroupDragBounds = useRef(new Map<string, HTMLDivElement>());
  const setTaskGroupDragBounds = useCallback(
    (groupKey: string) => (node: HTMLDivElement | null) => {
      if (node) {
        taskGroupDragBounds.current.set(groupKey, node);
      } else {
        taskGroupDragBounds.current.delete(groupKey);
      }
    },
    [],
  );
  const getDragScope = useCallback(
    (task: (typeof flattenedTasks)[number]) =>
      effectiveTaskGroupConfig.mode === 'none' ? 'all' : (taskGroupKeys.get(task.id) ?? task.id),
    [effectiveTaskGroupConfig.mode, taskGroupKeys],
  );

  const {
    activeItem: activeTask,
    targetIndent,
    targetParentName,
    originalIndentRef,
    visibleItems: visibleFlattenedTasks,
    sensors,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  } = useSortableDrag({ flattenedItems: flattenedTasks, minIndent: 0, getDragScope });

  const restrictTaskDragToGroup = useCallback<Modifier>(
    ({ draggingNodeRect, transform }) => {
      const activeGroupKey = activeTask ? taskGroupKeys.get(activeTask.id) : undefined;
      const bounds = activeGroupKey
        ? taskGroupDragBounds.current.get(activeGroupKey)?.getBoundingClientRect()
        : undefined;
      if (!bounds || !draggingNodeRect) return transform;

      return {
        ...transform,
        y: Math.min(
          Math.max(transform.y, bounds.top - draggingNodeRect.top),
          bounds.bottom - draggingNodeRect.bottom,
        ),
      };
    },
    [activeTask, taskGroupKeys],
  );

  const visibleTaskIds = useMemo(
    () => new Set(visibleFlattenedTasks.map((task) => task.id)),
    [visibleFlattenedTasks],
  );

  const {
    clearSelection,
    handleSelectionCheckboxClick,
    handleTaskClick,
    handleTaskContextMenu,
    isSelectionMode,
    selectedTaskIdSet,
  } = useTaskListSelection({ visibleTasks: visibleFlattenedTasks });

  const handleQuickAdd = () => {
    clearSelection();
    createTaskMutation.mutate(
      { title: '' },
      {
        onSuccess: (task) => {
          setSelectedTaskMutation.mutate({ id: task.id, focusTitle: true });
        },
      },
    );
  };

  const handleCreateTaskFromInput = () => {
    const title = newTaskTitle.trim();
    if (!title) return;

    clearSelection();
    createTaskMutation.mutate({ title });
    setNewTaskTitle('');
  };

  const handleTaskKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCreateTaskFromInput();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setNewTaskTitle('');
    }
  };

  const metaKey = getMetaKeyLabel();
  const modifierJoiner = getModifierJoiner();
  const newTaskShortcut = `${metaKey}${modifierJoiner}N`;

  // Group order is derived from task properties; manual drag-reordering applies within each group.
  const isRecentlyDeleted = activeView === 'recently-deleted';
  const isFilterView = activeView === 'filter';
  const isDragEnabled = sortConfig.mode === 'manual' && !isRecentlyDeleted;

  const visibleTaskCount = visibleTaskGroups.reduce(
    (count, group) => count + group.tasks.length,
    0,
  );
  if (visibleTaskCount === 0) {
    const isSearching = searchQuery.trim().length > 0;
    const { Icon, title, description, showCreateButton } = getEmptyState(
      isRecentlyDeleted,
      isFilterView,
      isSearching,
      newTaskShortcut,
    );

    return (
      <div className="app-task-list flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4">
        {isRecentlyDeleted && <RecentlyDeletedNoticeBanner />}
        <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
          <Icon className="mb-4 h-16 w-16 text-surface-300 dark:text-surface-600" />
          <h3 className="mb-2 font-medium text-lg text-surface-700 dark:text-surface-300">
            {title}
          </h3>
          <p className="mb-6 max-w-sm text-surface-500 dark:text-surface-400">{description}</p>
          {showCreateButton && (
            <button
              type="button"
              onClick={handleQuickAdd}
              className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 font-medium text-primary-contrast text-sm outline-hidden transition-colors hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              <Plus className="h-4 w-4" />
              New Task
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-task-list flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4">
      {isRecentlyDeleted && <RecentlyDeletedNoticeBanner />}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={effectiveTaskGroupConfig.mode === 'none' ? undefined : [restrictTaskDragToGroup]}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className={isRecentlyDeleted ? 'mt-4 space-y-4' : 'space-y-4'}>
          {visibleTaskGroups.map((group) => (
            <TaskGroupSection
              key={group.key}
              group={group}
              visibleTaskIds={visibleTaskIds}
              dragBoundsRef={setTaskGroupDragBounds(group.key)}
              showHeader={effectiveTaskGroupConfig.mode !== 'none'}
              isCollapsed={collapsedGroupKeys.has(group.key)}
              isDragEnabled={isDragEnabled}
              isSelectionMode={isSelectionMode}
              selectedTaskIdSet={selectedTaskIdSet}
              onTaskClick={handleTaskClick}
              onSelectionCheckboxClick={handleSelectionCheckboxClick}
              onTaskContextMenu={handleTaskContextMenu}
              onToggleCollapsed={() =>
                setCollapsedGroupKeys((keys) => {
                  const next = new Set(keys);
                  if (next.has(group.key)) next.delete(group.key);
                  else next.add(group.key);
                  return next;
                })
              }
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="drag-overlay relative" style={{ marginLeft: `${targetIndent * 24}px` }}>
              {targetIndent !== originalIndentRef.current && (
                <div className="absolute -top-6 left-2 whitespace-nowrap rounded-sm bg-primary-500 px-2 py-0.5 text-primary-contrast text-xs shadow-sm">
                  {targetIndent > originalIndentRef.current
                    ? `→ Nest in ${truncateName(targetParentName || 'parent')}`
                    : targetIndent === 0
                      ? '← Move to root'
                      : `← Move under ${truncateName(targetParentName || 'parent')}`}
                </div>
              )}
              <TaskItem
                task={activeTask}
                depth={0}
                ancestorIds={[]}
                isDragEnabled={false}
                isOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {!isRecentlyDeleted && !isSelectionMode && !isDraggingTask && (
        // biome-ignore lint/a11y/noStaticElementInteractions: wrapper focuses the nested input when clicking its non-interactive area
        <div
          onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
            const target = event.target as HTMLElement;
            if (target.closest('button') || target === newTaskInputRef.current) return;
            event.preventDefault();
            newTaskInputRef.current?.focus();
          }}
          className="mt-4 flex w-full cursor-text items-center gap-3 rounded-lg border border-surface-200 px-3 py-2.5 text-surface-500 outline-hidden transition-colors focus-within:bg-surface-50 dark:border-surface-700 dark:text-surface-400 dark:focus-within:bg-surface-800/50"
        >
          <label
            htmlFor="add-task-input"
            className="flex min-w-0 flex-1 cursor-text items-center gap-3"
          >
            <Plus className="h-5 w-5" />
            <input
              ref={newTaskInputRef}
              id="add-task-input"
              type="text"
              value={newTaskTitle}
              onChange={(event) => setNewTaskTitle(event.target.value)}
              onKeyDown={handleTaskKeyDown}
              placeholder="Add a task..."
              aria-label="Add a task"
              className="min-w-0 flex-1 bg-transparent text-surface-700 outline-hidden placeholder:text-surface-500 dark:text-surface-300 dark:placeholder:text-surface-400"
            />
          </label>
          {hasNewTaskTitle ? (
            <button
              type="button"
              onClick={handleCreateTaskFromInput}
              aria-label="Add task"
              className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-surface-400 outline-hidden transition-colors hover:bg-surface-200 hover:text-surface-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-500 dark:hover:bg-surface-700 dark:hover:text-surface-300"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <span className="h-6 w-6 shrink-0" aria-hidden="true" />
          )}
        </div>
      )}

      {!isRecentlyDeleted && !isSelectionMode && !isDraggingTask && (
        <button
          type="button"
          onClick={handleQuickAdd}
          className="mt-4 flex w-full items-center gap-3 rounded-lg border border-surface-200 p-3 text-surface-500 outline-hidden transition-colors hover:border-surface-300 hover:bg-surface-100 hover:text-surface-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:border-surface-600 dark:text-surface-400 dark:hover:border-surface-500 dark:hover:bg-surface-700 dark:hover:text-surface-300"
        >
          <Plus className="h-5 w-5" />
          <span>Add a task...</span>
        </button>
      )}
    </div>
  );
};
