import { closestCenter, DndContext, DragOverlay, type Modifier } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useVirtualizer } from '@tanstack/react-virtual';
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
import { TaskGroupHeader } from '$components/TaskGroupHeader';
import { TaskItem } from '$components/taskItem/TaskItem';
import { DEFAULT_SORT_CONFIG, DEFAULT_TASK_GROUP_CONFIG } from '$constants';
import { useTaskHighlight } from '$context/taskHighlightContext';
import { useCreateTask } from '$hooks/queries/useTasks';
import { useUIState } from '$hooks/queries/useUIState';
import { useVisibleTaskGroups, type VisibleTaskGroup } from '$hooks/queries/useVisibleTasks';
import { truncateName, useSortableDrag } from '$hooks/ui/useSortableDrag';
import { useTaskListSelection } from '$hooks/ui/useTaskListSelection';
import { getEffectiveTaskGroupConfig } from '$lib/task/grouping';
import type { LucideIcon } from '$types/lucide';
import type { FlattenedTask } from '$types/store/tasks';
import { getMetaKeyLabel, getModifierJoiner } from '$utils/keyboard';
import { getSortableItemKey } from '$utils/sortable';

const TASK_ROW_ESTIMATED_HEIGHT = 104;
const GROUP_HEADER_ESTIMATED_HEIGHT = 36;
const TASK_LIST_OVERSCAN = 6;

type TaskListRow =
  | {
      key: string;
      type: 'group-header';
      group: VisibleTaskGroup;
      isCollapsed: boolean;
    }
  | {
      key: string;
      type: 'task';
      group: VisibleTaskGroup;
      task: FlattenedTask;
      isLastInGroup: boolean;
    };

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
  const { highlightedTaskId } = useTaskHighlight();
  const visibleTaskGroups = useVisibleTaskGroups();
  const taskListRef = useRef<HTMLDivElement>(null);
  const taskVirtualContentRef = useRef<HTMLDivElement>(null);
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
  const createAndSelectTaskMutation = useCreateTask('created', { selectCreatedTask: true });
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

  const visibleTaskIds = useMemo(
    () => new Set(visibleFlattenedTasks.map((task) => task.id)),
    [visibleFlattenedTasks],
  );
  const sortableTaskIds = useMemo(
    () => visibleFlattenedTasks.map((task) => task.id),
    [visibleFlattenedTasks],
  );

  const showGroupHeaders = effectiveTaskGroupConfig.mode !== 'none';
  const taskListRows = useMemo(() => {
    const rows: TaskListRow[] = [];

    for (const group of visibleTaskGroups) {
      const isCollapsed = collapsedGroupKeys.has(group.key);
      const tasks = group.tasks.filter((task) => visibleTaskIds.has(task.id));
      if (tasks.length === 0 && !isCollapsed) continue;

      if (showGroupHeaders) {
        rows.push({
          key: `group:${group.key}`,
          type: 'group-header',
          group,
          isCollapsed,
        });
      }

      if (isCollapsed) continue;
      for (const [index, task] of tasks.entries()) {
        rows.push({
          key: getSortableItemKey(task.id, task.parentUid),
          type: 'task',
          group,
          task,
          isLastInGroup: index === tasks.length - 1,
        });
      }
    }

    return rows;
  }, [collapsedGroupKeys, showGroupHeaders, visibleTaskGroups, visibleTaskIds]);

  const taskRowIndexById = useMemo(() => {
    const indexes = new Map<string, number>();
    for (const [index, row] of taskListRows.entries()) {
      if (row.type === 'task') indexes.set(row.task.id, index);
    }
    return indexes;
  }, [taskListRows]);

  const groupTaskRowBounds = useMemo(() => {
    const bounds = new Map<string, { first: number; last: number }>();
    for (const [index, row] of taskListRows.entries()) {
      if (row.type !== 'task') continue;
      const current = bounds.get(row.group.key);
      if (current) current.last = index;
      else bounds.set(row.group.key, { first: index, last: index });
    }
    return bounds;
  }, [taskListRows]);

  const taskListRowOffsets = useMemo(() => {
    const offsets = [0];
    for (const row of taskListRows) {
      const estimatedSize =
        row.type === 'group-header' ? GROUP_HEADER_ESTIMATED_HEIGHT : TASK_ROW_ESTIMATED_HEIGHT;
      offsets.push((offsets[offsets.length - 1] ?? 0) + estimatedSize);
    }
    return offsets;
  }, [taskListRows]);

  const taskListVirtualizer = useVirtualizer({
    count: taskListRows.length,
    getScrollElement: () => taskListRef.current,
    estimateSize: (index) =>
      taskListRows[index]?.type === 'group-header'
        ? GROUP_HEADER_ESTIMATED_HEIGHT
        : TASK_ROW_ESTIMATED_HEIGHT,
    getItemKey: (index) => taskListRows[index]?.key ?? index,
    overscan: TASK_LIST_OVERSCAN,
    directDomUpdates: true,
    directDomUpdatesMode: 'position',
  });

  const setTaskVirtualContentRef = useCallback(
    (node: HTMLDivElement | null) => {
      taskVirtualContentRef.current = node;
      taskListVirtualizer.containerRef(node);
    },
    [taskListVirtualizer],
  );

  useEffect(() => {
    const taskId = highlightedTaskId ?? uiState?.selectedTaskId;
    if (!taskId) return;
    const rowIndex = taskRowIndexById.get(taskId);
    if (rowIndex === undefined) return;
    taskListVirtualizer.scrollToIndex(rowIndex, { align: 'auto' });
  }, [highlightedTaskId, taskListVirtualizer, taskRowIndexById, uiState?.selectedTaskId]);

  const restrictTaskDragToGroup = useCallback<Modifier>(
    ({ draggingNodeRect, transform }) => {
      const activeGroupKey = activeTask ? taskGroupKeys.get(activeTask.id) : undefined;
      const rowBounds = activeGroupKey ? groupTaskRowBounds.get(activeGroupKey) : undefined;
      const virtualContent = taskVirtualContentRef.current;
      if (!rowBounds || !virtualContent || !draggingNodeRect) {
        return transform;
      }

      const virtualContentTop = virtualContent.getBoundingClientRect().top;
      const totalEstimatedSize = taskListRowOffsets[taskListRowOffsets.length - 1] ?? 0;
      const measurementScale =
        totalEstimatedSize > 0 ? taskListVirtualizer.getTotalSize() / totalEstimatedSize : 1;
      const groupTop = virtualContentTop + taskListRowOffsets[rowBounds.first] * measurementScale;
      const groupBottom =
        virtualContentTop + taskListRowOffsets[rowBounds.last + 1] * measurementScale;
      return {
        ...transform,
        y: Math.min(
          Math.max(transform.y, groupTop - draggingNodeRect.top),
          groupBottom - draggingNodeRect.bottom,
        ),
      };
    },
    [activeTask, groupTaskRowBounds, taskGroupKeys, taskListRowOffsets, taskListVirtualizer],
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
    createAndSelectTaskMutation.mutate({ title: '' });
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

  // group order is derived from task properties; manual drag-reordering applies within each group.
  const isRecentlyDeleted = activeView === 'recently-deleted';
  const isFilterView = activeView === 'filter';
  const isDragEnabled = sortConfig.mode === 'manual' && !isRecentlyDeleted;
  const isDraggingTask = activeTask !== null;

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
          <Icon className="mb-4 h-16 w-16 text-surface-500 dark:text-surface-600" />
          <h3 className="mb-2 font-medium text-lg text-surface-700 dark:text-surface-300">
            {title}
          </h3>
          <p className="mb-6 max-w-sm text-surface-500 dark:text-surface-400">{description}</p>
          {showCreateButton && (
            <button
              type="button"
              onClick={handleQuickAdd}
              className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 font-medium text-primary-contrast text-sm outline-hidden transition-colors hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset"
            >
              <Plus className="h-4 w-4" />
              Create Task
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={taskListRef}
      className="app-task-list min-h-0 flex-1 overflow-y-auto overscroll-contain"
    >
      <div className="p-4">
        {isRecentlyDeleted && <RecentlyDeletedNoticeBanner />}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={
            effectiveTaskGroupConfig.mode === 'none' ? undefined : [restrictTaskDragToGroup]
          }
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={sortableTaskIds}
            strategy={verticalListSortingStrategy}
            disabled={!isDragEnabled}
          >
            <div
              ref={setTaskVirtualContentRef}
              className={isRecentlyDeleted ? 'relative mt-4' : 'relative'}
            >
              {taskListVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = taskListRows[virtualRow.index];
                if (!row) return null;

                return (
                  <div
                    key={row.key}
                    data-index={virtualRow.index}
                    ref={taskListVirtualizer.measureElement}
                    className="absolute left-0 w-full"
                  >
                    {row.type === 'group-header' ? (
                      <div className={row.isCollapsed ? 'pb-4' : ''}>
                        <TaskGroupHeader
                          group={row.group}
                          isCollapsed={row.isCollapsed}
                          onToggleCollapsed={() =>
                            setCollapsedGroupKeys((keys) => {
                              const next = new Set(keys);
                              if (next.has(row.group.key)) next.delete(row.group.key);
                              else next.add(row.group.key);
                              return next;
                            })
                          }
                        />
                      </div>
                    ) : (
                      <div className={row.isLastInGroup && showGroupHeaders ? 'pb-4' : 'pb-1.5'}>
                        <TaskItem
                          task={row.task}
                          depth={row.task.depth}
                          ancestorIds={row.task.ancestorIds}
                          isDragEnabled={isDragEnabled && !isSelectionMode}
                          isMultiSelected={selectedTaskIdSet.has(row.task.id)}
                          isSelectionMode={isSelectionMode}
                          hideDueDateBadge={
                            row.group.key.startsWith('due-date:') &&
                            row.group.key !== 'due-date:overdue' &&
                            !row.task.parentUid
                          }
                          hideStartDateBadge={
                            row.group.key.startsWith('start-date:') && !row.task.parentUid
                          }
                          hideCalendarBadge={row.group.key.startsWith('calendar:')}
                          onTaskClick={handleTaskClick}
                          onSelectionCheckboxClick={handleSelectionCheckboxClick}
                          onTaskContextMenu={handleTaskContextMenu}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <div
                className="drag-overlay relative"
                style={{ marginLeft: `${targetIndent * 24}px` }}
              >
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
                className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-surface-400 outline-hidden transition-colors hover:bg-surface-200 hover:text-surface-700 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:text-surface-500 dark:hover:bg-surface-700 dark:hover:text-surface-300"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <span className="h-6 w-6 shrink-0" aria-hidden="true" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
