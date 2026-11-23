import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import ArrowRight from 'lucide-react/icons/arrow-right';
import CheckCheck from 'lucide-react/icons/check-check';
import ListX from 'lucide-react/icons/list-x';
import Plus from 'lucide-react/icons/plus';
import { type KeyboardEvent, type MouseEvent, useMemo, useRef, useState } from 'react';
import { TaskEditorEmptyState } from '$components/taskEditor/TaskEditorEmptyState';
import { TaskEditorSubtaskItem } from '$components/taskEditor/TaskEditorSubtaskItem';
import { useChildTasks, useCreateTask, useTasks } from '$hooks/queries/useTasks';
import { useSortConfig } from '$hooks/queries/useUIState';
import { truncateName, useSortableDrag } from '$hooks/ui/useSortableDrag';
import { getSortedTasks } from '$lib/store/tasks';
import type { FlattenedTask } from '$types/store/tasks';
import type { Task } from '$types/task/model';
import { getSortableItemKey } from '$utils/sortable';

interface SubtasksProps {
  task: Task;
  checkmarkColor: string;
  useAccentColorForCheckboxes: boolean;
  updateTask: (id: string, updates: Partial<Task>) => void;
  moveTaskToRecentlyDeleted: (id: string) => Promise<boolean>;
  readOnly?: boolean;
}

export const TaskEditorSubtasks = ({
  task,
  checkmarkColor,
  useAccentColorForCheckboxes,
  updateTask,
  moveTaskToRecentlyDeleted,
  readOnly = false,
}: SubtasksProps) => {
  const createTaskMutation = useCreateTask();
  const childTaskFilter = task.deletedAt ? 'deleted' : 'active';
  const { data: childTasks = [] } = useChildTasks(task.uid, childTaskFilter);
  const childCount = childTasks.length;
  const { data: allTasks = [] } = useTasks();
  const sortConfig = useSortConfig();

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const newSubtaskInputRef = useRef<HTMLInputElement>(null);
  const hasNewSubtaskTitle = newSubtaskTitle.trim().length > 0;

  const flattenedSubtasks = useMemo<FlattenedTask[]>(() => {
    const getChildren = (uid: string) =>
      getSortedTasks(
        allTasks.filter((t) => {
          if (t.parentUid !== uid) return false;
          return childTaskFilter === 'deleted' ? !!t.deletedAt : !t.deletedAt;
        }),
        sortConfig,
      );

    const flatten = (tasks: Task[], ancestorIds: string[]) => {
      const result: FlattenedTask[] = [];
      for (const t of tasks) {
        result.push({ ...t, depth: ancestorIds.length, ancestorIds });
        if (expandedSubtasks.has(t.id)) {
          result.push(...flatten(getChildren(t.uid), [...ancestorIds, t.id]));
        }
      }
      return result;
    };
    return [{ ...task, depth: 0, ancestorIds: [] }, ...flatten(getChildren(task.uid), [task.id])];
  }, [task, allTasks, childTaskFilter, expandedSubtasks, sortConfig]);

  const anySubtaskDragEnabled =
    sortConfig.mode === 'manual' && !readOnly && flattenedSubtasks.length > 2;

  const {
    activeItem: activeDragSubtask,
    targetIndent: targetSubtaskIndent,
    targetParentName: targetSubtaskParentName,
    originalIndentRef: subtaskOriginalIndentRef,
    visibleItems: visibleFlattenedSubtasks,
    sensors: subtaskSensors,
    handleDragStart: handleSubtaskDragStart,
    handleDragMove: handleSubtaskDragMove,
    handleDragEnd: handleSubtaskDragEnd,
    handleDragCancel: handleSubtaskDragCancel,
  } = useSortableDrag({
    flattenedItems: flattenedSubtasks,
    minIndent: 1,
    onDropIntoParent: (parentId) => setExpandedSubtasks((prev) => new Set([...prev, parentId])),
  });

  const handleAddChildTask = (title: string) => {
    createTaskMutation.mutate({
      title,
      parentUid: task.uid,
      accountId: task.accountId,
      calendarId: task.calendarId,
    });
  };

  const handleCreateSubtaskFromInput = () => {
    const title = newSubtaskTitle.trim();
    if (!title) return;

    handleAddChildTask(title);
    setNewSubtaskTitle('');
  };

  const handleSubtaskKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateSubtaskFromInput();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setNewSubtaskTitle('');
    }
  };

  const handleSubtaskBlur = () => {
    handleCreateSubtaskFromInput();
    setNewSubtaskTitle('');
  };

  return (
    <div>
      <div
        id="subtasks-label"
        className="mb-2 flex items-center gap-2 font-medium text-sm text-surface-600 dark:text-surface-400"
      >
        <CheckCheck className="h-4 w-4" />
        Subtasks
        {childCount > 0 && (
          <span className="rounded-full bg-surface-100 px-1.5 py-0.5 font-normal text-surface-500 text-xs tabular-nums dark:bg-surface-800 dark:text-surface-400">
            {childCount}
          </span>
        )}
      </div>

      {/* biome-ignore lint/a11y/useSemanticElements: fieldset would change semantic structure; div with role="group" is appropriate here */}
      <div
        className={`overflow-hidden rounded-lg ${
          readOnly && childTasks.length === 0
            ? ''
            : 'border border-surface-200 dark:border-surface-700'
        }`}
        role="group"
        aria-labelledby="subtasks-label"
      >
        {childTasks.length > 0 && (
          <div className="overflow-x-auto p-1">
            <div className="w-full min-w-max">
              <DndContext
                sensors={subtaskSensors}
                collisionDetection={closestCenter}
                onDragStart={handleSubtaskDragStart}
                onDragMove={handleSubtaskDragMove}
                onDragEnd={handleSubtaskDragEnd}
                onDragCancel={handleSubtaskDragCancel}
              >
                <SortableContext
                  items={visibleFlattenedSubtasks.slice(1).map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {visibleFlattenedSubtasks.slice(1).map((flatItem) => (
                    <TaskEditorSubtaskItem
                      key={getSortableItemKey(flatItem.id, flatItem.parentUid)}
                      task={flatItem}
                      depth={flatItem.depth - 1}
                      checkmarkColor={checkmarkColor}
                      useAccentColorForCheckboxes={useAccentColorForCheckboxes}
                      expandedSubtasks={expandedSubtasks}
                      setExpandedSubtasks={setExpandedSubtasks}
                      updateTask={updateTask}
                      moveTaskToRecentlyDeleted={moveTaskToRecentlyDeleted}
                      isDragEnabled={anySubtaskDragEnabled}
                      readOnly={readOnly}
                    />
                  ))}
                </SortableContext>

                <DragOverlay dropAnimation={null}>
                  {activeDragSubtask ? (
                    <div
                      className="drag-overlay relative"
                      style={{
                        marginLeft: `${Math.max(0, targetSubtaskIndent - 1) * 24}px`,
                      }}
                    >
                      {targetSubtaskIndent !== subtaskOriginalIndentRef.current && (
                        <div className="absolute -top-6 left-2 whitespace-nowrap rounded-sm bg-primary-500 px-2 py-0.5 text-primary-contrast text-xs shadow-sm">
                          {targetSubtaskIndent > subtaskOriginalIndentRef.current
                            ? `→ Nest in ${truncateName(targetSubtaskParentName || 'parent')}`
                            : targetSubtaskIndent === 1
                              ? '← Move to top level'
                              : `← Move under ${truncateName(targetSubtaskParentName || 'parent')}`}
                        </div>
                      )}
                      <TaskEditorSubtaskItem
                        task={activeDragSubtask}
                        depth={0}
                        checkmarkColor={checkmarkColor}
                        useAccentColorForCheckboxes={useAccentColorForCheckboxes}
                        expandedSubtasks={expandedSubtasks}
                        setExpandedSubtasks={setExpandedSubtasks}
                        updateTask={updateTask}
                        moveTaskToRecentlyDeleted={moveTaskToRecentlyDeleted}
                        isDragEnabled={false}
                        readOnly={readOnly}
                        isOverlay
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        )}

        {readOnly && childTasks.length === 0 ? (
          <TaskEditorEmptyState icon={<ListX className="h-4 w-4 shrink-0" />}>
            No subtasks
          </TaskEditorEmptyState>
        ) : !readOnly ? (
          // biome-ignore lint/a11y/noStaticElementInteractions: wrapper focuses the nested input when clicking its non-interactive area
          <div
            onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
              const target = event.target as HTMLElement;
              if (target.closest('button') || target === newSubtaskInputRef.current) return;
              event.preventDefault();
              newSubtaskInputRef.current?.focus();
            }}
            className={`flex cursor-text items-center gap-2 py-2 pr-3 pl-3 text-surface-400 transition-colors focus-within:bg-surface-50 dark:text-surface-500 dark:focus-within:bg-surface-800/50 ${
              childTasks.length > 0 ? 'border-surface-200 border-t dark:border-surface-700' : ''
            }`}
          >
            <label
              htmlFor="add-subtask-input"
              className="flex min-w-0 flex-1 cursor-text items-center gap-2"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <input
                ref={newSubtaskInputRef}
                id="add-subtask-input"
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={handleSubtaskKeyDown}
                onBlur={handleSubtaskBlur}
                placeholder="Add a subtask..."
                aria-label="Add a subtask"
                className="flex-1 bg-transparent text-sm text-surface-700 outline-hidden placeholder:text-surface-400 dark:text-surface-300 dark:placeholder:text-surface-500"
              />
            </label>
            {hasNewSubtaskTitle ? (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleCreateSubtaskFromInput}
                aria-label="Add subtask"
                className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-surface-400 outline-hidden transition-colors hover:bg-surface-100 hover:text-surface-600 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:text-surface-500 dark:hover:bg-surface-800 dark:hover:text-surface-400"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <span className="h-5 w-5 shrink-0" aria-hidden="true" />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
