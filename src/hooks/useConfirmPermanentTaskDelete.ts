import { useCallback } from 'react';
import { usePermanentDeleteTask, useTasks } from '$hooks/queries/useTasks';
import { useConfirmDialog } from '$hooks/store/useConfirmDialog';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { pluralize } from '$utils/misc';

export const useConfirmPermanentTaskDelete = () => {
  const { confirmBeforePermanentDelete, deleteSubtasksWithParent } = useSettingsStore();
  const { data: tasks = [] } = useTasks();
  const permanentDeleteTaskMutation = usePermanentDeleteTask();
  const { confirm, close } = useConfirmDialog();

  const confirmAndDeletePermanently = useCallback(
    async (taskId: string | null | undefined) => {
      if (!taskId) return false;

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return false;

      const deleteChildren = deleteSubtasksWithParent === 'delete';

      if (confirmBeforePermanentDelete) {
        const countAllDescendants = (parentUid: string): number => {
          const children = tasks.filter((t) => t.parentUid === parentUid);
          return children.reduce((acc, child) => acc + 1 + countAllDescendants(child.uid), 0);
        };

        const descendantCount = countAllDescendants(task.uid);
        const message =
          descendantCount > 0 && deleteChildren
            ? `This task has ${descendantCount} ${pluralize(descendantCount, 'subtask')} that will also be permanently deleted. This cannot be undone.`
            : descendantCount > 0
              ? `This task has ${descendantCount} ${pluralize(descendantCount, 'subtask')} that will be kept. This cannot be undone.`
              : 'This will permanently delete the task. This cannot be undone.';

        const confirmed = await confirm({
          title: 'Delete permanently',
          subtitle: task.title || 'Untitled task',
          message,
          confirmLabel: 'Delete permanently',
          cancelLabel: 'Cancel',
          destructive: true,
          delayConfirmSeconds: 1,
        });
        close();
        if (!confirmed) return false;
      }

      permanentDeleteTaskMutation.mutate({ id: taskId, deleteChildren });
      return true;
    },
    [
      close,
      confirm,
      confirmBeforePermanentDelete,
      deleteSubtasksWithParent,
      permanentDeleteTaskMutation,
      tasks,
    ],
  );

  return { confirmAndDeletePermanently };
};
