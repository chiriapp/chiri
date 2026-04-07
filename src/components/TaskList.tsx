import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import ListTodo from 'lucide-react/icons/list-todo';
import Plus from 'lucide-react/icons/plus';
import { useCallback, useMemo } from 'react';
import { TaskItem } from '$components/taskItem/TaskItem';
import { DEFAULT_SORT_CONFIG } from '$constants';
import { useCreateTask, useFilteredTasks } from '$hooks/queries/useTasks';
import { useSetSelectedTask, useUIState } from '$hooks/queries/useUIState';
import { truncateName, useSortableDrag } from '$hooks/ui/useSortableDrag';
import { getSortedTasks } from '$lib/store/filters';
import { getChildTasks } from '$lib/store/tasks';
import { getMetaKeyLabel, getModifierJoiner } from '$utils/keyboard';
import { flattenTasks } from '$utils/tree';

export const TaskList = () => {
  const { data: uiState } = useUIState();
  const { data: filteredTasksData = [] } = useFilteredTasks();
  const createTaskMutation = useCreateTask();
  const setSelectedTaskMutation = useSetSelectedTask();

  const sortConfig = uiState?.sortConfig ?? DEFAULT_SORT_CONFIG;
  const searchQuery = uiState?.searchQuery ?? '';
  const showCompletedTasks = uiState?.showCompletedTasks ?? true;

  const filteredTasks = filteredTasksData;

  // filter out child tasks - top level only for the root
  const topLevelTasks = useMemo(
    () => filteredTasks.filter((task) => !task.parentUid),
    [filteredTasks],
  );

  const sortedTasks = useMemo(
    () => getSortedTasks(topLevelTasks, sortConfig),
    [topLevelTasks, sortConfig],
  );

  const getFilteredChildTasks = useCallback(
    (parentUid: string) => {
      const children = getChildTasks(parentUid);
      if (!showCompletedTasks) {
        return children.filter(
          (task) => task.status !== 'completed' && task.status !== 'cancelled',
        );
      }
      return children;
    },
    [showCompletedTasks],
  );

  const flattenedTasks = useMemo(
    () =>
      flattenTasks(sortedTasks, getFilteredChildTasks, (tasks) =>
        getSortedTasks(tasks, sortConfig),
      ),
    [sortedTasks, getFilteredChildTasks, sortConfig],
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
  } = useSortableDrag({ flattenedItems: flattenedTasks, minIndent: 0 });

  const handleQuickAdd = () => {
    createTaskMutation.mutate(
      { title: '' },
      {
        onSuccess: (task) => {
          setSelectedTaskMutation.mutate(task.id);
        },
      },
    );
  };

  const metaKey = getMetaKeyLabel();
  const modifierJoiner = getModifierJoiner();
  const newTaskShortcut = `${metaKey}${modifierJoiner}N`;

  // only enable dragging for manual sort mode
  const isDragEnabled = sortConfig.mode === 'manual';

  if (flattenedTasks.length === 0) {
    const isSearching = searchQuery.trim().length > 0;

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <ListTodo className="w-16 h-16 text-surface-300 dark:text-surface-600 mb-4" />
        <h3 className="text-lg font-medium text-surface-700 dark:text-surface-300 mb-2">
          {isSearching ? 'No tasks found' : 'No tasks yet'}
        </h3>
        <p className="text-surface-500 dark:text-surface-400 mb-6 max-w-sm">
          {isSearching ? (
            'Try adjusting your search terms.'
          ) : (
            <>
              Click the button below or press{' '}
              <kbd className="px-2 py-1 bg-surface-100 dark:bg-surface-700 rounded-sm text-sm font-mono">
                {newTaskShortcut}
              </kbd>{' '}
              to create a new task.
            </>
          )}
        </p>
        {!isSearching && (
          <button
            type="button"
            onClick={handleQuickAdd}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-primary-contrast rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 overscroll-contain">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={visibleFlattenedTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
          disabled={!isDragEnabled}
        >
          <div className="space-y-1.5">
            {visibleFlattenedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                depth={task.depth}
                ancestorIds={task.ancestorIds}
                isDragEnabled={isDragEnabled}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="drag-overlay relative" style={{ marginLeft: `${targetIndent * 24}px` }}>
              {targetIndent !== originalIndentRef.current && (
                <div className="absolute -top-6 left-2 px-2 py-0.5 bg-primary-500 text-primary-contrast text-xs rounded-sm shadow-sm whitespace-nowrap">
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

      <button
        type="button"
        onClick={handleQuickAdd}
        className="mt-4 w-full flex items-center gap-3 p-3 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors border border-surface-200 dark:border-surface-600 hover:border-surface-300 dark:hover:border-surface-500 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
      >
        <Plus className="w-5 h-5" />
        <span>Add a task...</span>
      </button>
    </div>
  );
};
