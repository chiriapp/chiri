import Info from 'lucide-react/icons/info';
import { createElement, useCallback } from 'react';
import { useConfirmDialog } from '$context/confirmDialogContext';
import { useSettingsStore } from '$context/settingsContext';
import { useDeleteTask, usePermanentDeleteTask, useTasks } from '$hooks/queries/useTasks';
import { useSetRecentlyDeletedView } from '$hooks/queries/useUIState';
import { toastManager } from '$hooks/ui/useToast';
import type { Task } from '$types';
import { pluralize } from '$utils/misc';
import { isDiscardableUntitledLocalDraft } from '$utils/taskDeletion';

const countAllDescendants = (tasks: Task[], parentUid: string): number => {
  const children = tasks.filter((t) => t.parentUid === parentUid);
  return children.reduce((acc, child) => acc + 1 + countAllDescendants(tasks, child.uid), 0);
};

const getPermanentDeleteMessage = (task: Task, tasks: Task[], deleteChildren: boolean) => {
  const descendantCount = countAllDescendants(tasks, task.uid);

  if (descendantCount > 0 && deleteChildren) {
    return `This task has ${descendantCount} ${pluralize(descendantCount, 'subtask')} that will also be permanently deleted. This cannot be undone.`;
  }

  if (descendantCount > 0) {
    return `This task has ${descendantCount} ${pluralize(descendantCount, 'subtask')} that will be kept. This cannot be undone.`;
  }

  return 'This will permanently delete the task. This cannot be undone.';
};

const getRecentlyDeletedMessage = (task: Task, tasks: Task[], deleteChildren: boolean) => {
  const descendantCount = countAllDescendants(tasks, task.uid);

  if (descendantCount > 0 && deleteChildren) {
    return `This task has ${descendantCount} ${pluralize(descendantCount, 'subtask')} that will also move to Recently Deleted.`;
  }

  if (descendantCount > 0) {
    return `This task has ${descendantCount} ${pluralize(descendantCount, 'subtask')} that will stay in your lists.`;
  }

  return 'You can restore this task from Recently Deleted.';
};

export const useTaskDeletion = () => {
  const {
    confirmBeforeMoveToRecentlyDeleted,
    deleteSubtasksWithParent,
    hasSeenRecentlyDeletedToast,
    setHasSeenRecentlyDeletedToast,
  } = useSettingsStore();
  const { data: tasks = [] } = useTasks();
  const deleteTaskMutation = useDeleteTask();
  const permanentDeleteTaskMutation = usePermanentDeleteTask();
  const setRecentlyDeletedViewMutation = useSetRecentlyDeletedView();
  const { confirm, close } = useConfirmDialog();

  const moveTasksToRecentlyDeleted = useCallback(
    async (taskIds: Array<string | null | undefined>) => {
      const seenTaskIds = new Set<string>();
      const tasksToDelete = taskIds.flatMap((taskId) => {
        if (!taskId || seenTaskIds.has(taskId)) return [];
        seenTaskIds.add(taskId);

        const task = tasks.find((candidate) => candidate.id === taskId);
        return task ? [task] : [];
      });

      if (tasksToDelete.length === 0) return false;

      const deleteChildren = deleteSubtasksWithParent === 'delete';
      const normalTasks = tasksToDelete.filter(
        (task) => !isDiscardableUntitledLocalDraft(task, tasks),
      );

      if (confirmBeforeMoveToRecentlyDeleted && normalTasks.length > 0) {
        const taskCount = normalTasks.length;
        const message =
          taskCount === 1
            ? getRecentlyDeletedMessage(normalTasks[0], tasks, deleteChildren)
            : `${taskCount} selected ${pluralize(taskCount, 'task')} will move to Recently Deleted.`;

        const confirmed = await confirm({
          title: 'Move to Recently Deleted',
          subtitle:
            taskCount === 1
              ? normalTasks[0].title || 'Untitled task'
              : `${taskCount} selected ${pluralize(taskCount, 'task')}`,
          message,
          confirmLabel: 'Move to Recently Deleted',
          cancelLabel: 'Cancel',
          destructive: true,
        });
        close();
        if (!confirmed) return false;
      }

      for (const task of tasksToDelete) {
        if (isDiscardableUntitledLocalDraft(task, tasks)) {
          permanentDeleteTaskMutation.mutate({ id: task.id, deleteChildren: true });
        } else {
          deleteTaskMutation.mutate({ id: task.id, deleteChildren });
        }
      }

      if (normalTasks.length > 0 && !hasSeenRecentlyDeletedToast) {
        setHasSeenRecentlyDeletedToast(true);
        toastManager.info(
          createElement(
            'span',
            { className: 'inline-flex items-center gap-2' },
            createElement(Info, {
              className: 'h-4 w-4 shrink-0 text-primary-500',
              'aria-hidden': true,
            }),
            'Moved to Recently Deleted',
          ),
          'Deleted tasks live in Recently Deleted until you restore or permanently delete them.',
          'recently-deleted-intro',
          {
            label: 'View',
            onClick: () => setRecentlyDeletedViewMutation.mutate(),
          },
          false,
          { icon: null },
        );
      }
      return true;
    },
    [
      close,
      confirm,
      confirmBeforeMoveToRecentlyDeleted,
      deleteSubtasksWithParent,
      deleteTaskMutation,
      hasSeenRecentlyDeletedToast,
      permanentDeleteTaskMutation,
      setHasSeenRecentlyDeletedToast,
      setRecentlyDeletedViewMutation,
      tasks,
    ],
  );

  const moveTaskToRecentlyDeleted = useCallback(
    (taskId: string | null | undefined) => moveTasksToRecentlyDeleted([taskId]),
    [moveTasksToRecentlyDeleted],
  );

  const deleteTasksPermanently = useCallback(
    async (taskIds: Array<string | null | undefined>) => {
      const seenTaskIds = new Set<string>();
      const tasksToDelete = taskIds.flatMap((taskId) => {
        if (!taskId || seenTaskIds.has(taskId)) return [];
        seenTaskIds.add(taskId);

        const task = tasks.find((t) => t.id === taskId);
        return task ? [task] : [];
      });

      if (tasksToDelete.length === 0) return false;

      const deleteChildren = deleteSubtasksWithParent === 'delete';

      const taskCount = tasksToDelete.length;
      const message =
        taskCount === 1
          ? getPermanentDeleteMessage(tasksToDelete[0], tasks, deleteChildren)
          : `This will permanently delete ${taskCount} selected ${pluralize(
              taskCount,
              'task',
            )}. This cannot be undone.`;

      const confirmed = await confirm({
        title: 'Delete permanently',
        subtitle:
          taskCount === 1
            ? tasksToDelete[0].title || 'Untitled task'
            : `${taskCount} selected ${pluralize(taskCount, 'task')}`,
        message,
        confirmLabel: 'Delete permanently',
        cancelLabel: 'Cancel',
        destructive: true,
      });
      close();
      if (!confirmed) return false;

      for (const task of tasksToDelete) {
        permanentDeleteTaskMutation.mutate({ id: task.id, deleteChildren });
      }
      return true;
    },
    [close, confirm, deleteSubtasksWithParent, permanentDeleteTaskMutation, tasks],
  );

  const deleteTaskPermanently = useCallback(
    (taskId: string | null | undefined) => deleteTasksPermanently([taskId]),
    [deleteTasksPermanently],
  );

  return {
    moveTaskToRecentlyDeleted,
    moveTasksToRecentlyDeleted,
    deleteTaskPermanently,
    deleteTasksPermanently,
  };
};
