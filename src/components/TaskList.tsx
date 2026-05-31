import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import ClipboardPlus from 'lucide-react/icons/clipboard-plus';
import FunnelX from 'lucide-react/icons/funnel-x';
import Plus from 'lucide-react/icons/plus';
import SearchX from 'lucide-react/icons/search-x';
import Trash2 from 'lucide-react/icons/trash-2';
import type { ReactNode } from 'react';
import { RecentlyDeletedNoticeBanner } from '$components/RecentlyDeletedNoticeBanner';
import { TaskItem } from '$components/taskItem/TaskItem';
import { DEFAULT_SORT_CONFIG } from '$constants';
import { useCreateTask } from '$hooks/queries/useTasks';
import { useSetSelectedTask, useUIState } from '$hooks/queries/useUIState';
import { useVisibleTasks } from '$hooks/queries/useVisibleTasks';
import { truncateName, useSortableDrag } from '$hooks/ui/useSortableDrag';
import { useTaskListSelection } from '$hooks/ui/useTaskListSelection';
import type { LucideIcon } from '$types/lucide';
import { getMetaKeyLabel, getModifierJoiner } from '$utils/keyboard';
import { getSortableItemKey } from '$utils/sortable';

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
        <kbd className="px-2 py-1 bg-surface-100 dark:bg-surface-700 rounded-sm text-sm font-mono">
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
  const flattenedTasks = useVisibleTasks();
  const createTaskMutation = useCreateTask();
  const setSelectedTaskMutation = useSetSelectedTask();

  const sortConfig = uiState?.sortConfig ?? DEFAULT_SORT_CONFIG;
  const searchQuery = uiState?.searchQuery ?? '';
  const activeView = uiState?.activeView ?? 'tasks';

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

  const metaKey = getMetaKeyLabel();
  const modifierJoiner = getModifierJoiner();
  const newTaskShortcut = `${metaKey}${modifierJoiner}N`;

  // only enable dragging for manual sort mode
  const isRecentlyDeleted = activeView === 'recently-deleted';
  const isFilterView = activeView === 'filter';
  const isDragEnabled = sortConfig.mode === 'manual' && !isRecentlyDeleted;
  const isDraggingTask = activeTask !== null;

  if (flattenedTasks.length === 0) {
    const isSearching = searchQuery.trim().length > 0;
    const { Icon, title, description, showCreateButton } = getEmptyState(
      isRecentlyDeleted,
      isFilterView,
      isSearching,
      newTaskShortcut,
    );

    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 overscroll-contain">
        {isRecentlyDeleted && <RecentlyDeletedNoticeBanner />}
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <Icon className="w-16 h-16 text-surface-300 dark:text-surface-600 mb-4" />
          <h3 className="text-lg font-medium text-surface-700 dark:text-surface-300 mb-2">
            {title}
          </h3>
          <p className="text-surface-500 dark:text-surface-400 mb-6 max-w-sm">{description}</p>
          {showCreateButton && (
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
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 overscroll-contain">
      {isRecentlyDeleted && <RecentlyDeletedNoticeBanner />}
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
          <div className={isRecentlyDeleted ? 'mt-4 space-y-1.5' : 'space-y-1.5'}>
            {visibleFlattenedTasks.map((task) => (
              <TaskItem
                key={getSortableItemKey(task.id, task.parentUid)}
                task={task}
                depth={task.depth}
                ancestorIds={task.ancestorIds}
                isDragEnabled={isDragEnabled && !isSelectionMode}
                isMultiSelected={selectedTaskIdSet.has(task.id)}
                isSelectionMode={isSelectionMode}
                onTaskClick={handleTaskClick}
                onSelectionCheckboxClick={handleSelectionCheckboxClick}
                onTaskContextMenu={handleTaskContextMenu}
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

      {!isRecentlyDeleted && !isSelectionMode && !isDraggingTask && (
        <button
          type="button"
          onClick={handleQuickAdd}
          className="mt-4 w-full flex items-center gap-3 p-3 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors border border-surface-200 dark:border-surface-600 hover:border-surface-300 dark:hover:border-surface-500 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
        >
          <Plus className="w-5 h-5" />
          <span>Add a task...</span>
        </button>
      )}
    </div>
  );
};
