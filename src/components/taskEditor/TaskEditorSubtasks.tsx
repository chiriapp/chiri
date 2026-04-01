import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import Plus from 'lucide-react/icons/plus';
import { useMemo, useState } from 'react';
import { SubtaskTreeItem } from '$components/SubtaskTreeItem';
import { useChildTasks, useCreateTask, useTasks } from '$hooks/queries/useTasks';
import { truncateName, useSortableDrag } from '$hooks/ui/useSortableDrag';
import { getSortedTasks } from '$lib/store/filters';
import { countChildren } from '$lib/store/tasks';
import type { Task } from '$types';
import type { FlattenedTask } from '$utils/tree';

interface SubtasksProps {
  task: Task;
  checkmarkColor: string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  confirmAndDelete: (id: string) => Promise<boolean>;
}

export const TaskEditorSubtasks = ({
  task,
  checkmarkColor,
  updateTask,
  confirmAndDelete,
}: SubtasksProps) => {
  const createTaskMutation = useCreateTask();
  const { data: childTasks = [] } = useChildTasks(task.uid);
  const childCount = countChildren(task.uid);
  const { data: allTasks = [] } = useTasks();

  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());

  const flattenedSubtasks = useMemo<FlattenedTask[]>(() => {
    const getChildren = (uid: string) =>
      getSortedTasks(allTasks.filter((t) => t.parentUid === uid));

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
  }, [task, allTasks, expandedSubtasks]);

  const anySubtaskDragEnabled = flattenedSubtasks.length > 2;

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
      priority: 'none',
    });
  };

  const handleSubtaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (newSubtaskTitle.trim()) {
        handleAddChildTask(newSubtaskTitle.trim());
        setNewSubtaskTitle('');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setNewSubtaskTitle('');
      setShowAddSubtask(false);
    }
  };

  const handleSubtaskBlur = () => {
    if (newSubtaskTitle.trim()) {
      handleAddChildTask(newSubtaskTitle.trim());
    }
    setNewSubtaskTitle('');
    setShowAddSubtask(false);
  };

  return (
    <div>
      <div
        id="subtasks-label"
        className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
      >
        <CheckCircle2 className="w-4 h-4" />
        Subtasks
        {childCount > 0 && (
          <span className="text-xs bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 rounded-full px-1.5 py-0.5 font-normal tabular-nums">
            {childCount}
          </span>
        )}
      </div>

      {/* biome-ignore lint/a11y/useSemanticElements: fieldset would change semantic structure; div with role="group" is appropriate here */}
      <div
        className="rounded-lg border overflow-hidden border-surface-200 dark:border-surface-700"
        role="group"
        aria-labelledby="subtasks-label"
      >
        {childTasks.length > 0 && (
          <div className="p-1 overflow-x-auto">
            <div className="min-w-max w-full">
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
                    <SubtaskTreeItem
                      key={flatItem.id}
                      task={flatItem}
                      depth={flatItem.depth - 1}
                      checkmarkColor={checkmarkColor}
                      expandedSubtasks={expandedSubtasks}
                      setExpandedSubtasks={setExpandedSubtasks}
                      updateTask={updateTask}
                      confirmAndDelete={confirmAndDelete}
                      isDragEnabled={anySubtaskDragEnabled}
                    />
                  ))}
                </SortableContext>

                <DragOverlay dropAnimation={null}>
                  {activeDragSubtask ? (
                    <div className="relative">
                      {targetSubtaskIndent !== subtaskOriginalIndentRef.current && (
                        <div className="absolute -top-6 left-2 px-2 py-0.5 bg-primary-600 text-primary-contrast text-xs rounded shadow whitespace-nowrap">
                          {targetSubtaskIndent > subtaskOriginalIndentRef.current
                            ? `→ Nest in ${truncateName(targetSubtaskParentName || 'parent')}`
                            : targetSubtaskIndent === 1
                              ? '← Move to top level'
                              : `← Move under ${truncateName(targetSubtaskParentName || 'parent')}`}
                        </div>
                      )}
                      <SubtaskTreeItem
                        task={activeDragSubtask}
                        depth={targetSubtaskIndent - 1}
                        checkmarkColor={checkmarkColor}
                        expandedSubtasks={expandedSubtasks}
                        setExpandedSubtasks={setExpandedSubtasks}
                        updateTask={updateTask}
                        confirmAndDelete={confirmAndDelete}
                        isDragEnabled={false}
                        isOverlay
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        )}

        {showAddSubtask ? (
          <div
            className={`flex items-center gap-2 py-2 pr-3 pl-3 ${
              childTasks.length > 0 ? 'border-t border-surface-200 dark:border-surface-700' : ''
            }`}
          >
            <div className="w-4 h-4 rounded border border-dashed border-surface-300 dark:border-surface-600 flex-shrink-0" />
            <input
              // biome-ignore lint/a11y/noAutofocus: intentional — user just clicked "Add subtask"
              autoFocus
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={handleSubtaskKeyDown}
              onBlur={handleSubtaskBlur}
              placeholder="New subtask..."
              className="flex-1 text-sm bg-transparent outline-none text-surface-700 dark:text-surface-300 placeholder:text-surface-400 dark:placeholder:text-surface-500"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddSubtask(true)}
            className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${
              childTasks.length > 0 ? 'border-t border-surface-200 dark:border-surface-700' : ''
            }`}
          >
            <Plus className="w-4 h-4" />
            Add subtask
          </button>
        )}
      </div>
    </div>
  );
};
