import { useCallback } from 'react';
import { useDeleteTask, usePermanentDeleteTask, useTasks } from '$hooks/queries/useTasks';
import { useSetRecentlyDeletedView } from '$hooks/queries/useUIState';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { toastManager } from '$hooks/ui/useToast';

export const useConfirmTaskDelete = () => {
  const { deleteSubtasksWithParent, hasSeenRecentlyDeletedToast, setHasSeenRecentlyDeletedToast } =
    useSettingsStore();
  const { data: tasks = [] } = useTasks();
  const deleteTaskMutation = useDeleteTask();
  const permanentDeleteTaskMutation = usePermanentDeleteTask();
  const setRecentlyDeletedViewMutation = useSetRecentlyDeletedView();

  const confirmAndDelete = useCallback(
    async (taskId: string | null | undefined) => {
      if (!taskId) return false;

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return false;

      const deleteChildren = deleteSubtasksWithParent === 'delete';
      const isUntitledLocalDraft = !task.title.trim() && !task.href;

      if (isUntitledLocalDraft) {
        permanentDeleteTaskMutation.mutate({ id: taskId, deleteChildren: true });
        return true;
      }

      deleteTaskMutation.mutate({ id: taskId, deleteChildren });
      if (!hasSeenRecentlyDeletedToast) {
        setHasSeenRecentlyDeletedToast(true);
        toastManager.info(
          'Moved to Recently Deleted',
          "Deleted tasks live in the sidebar's Recently Deleted view until you restore or permanently delete them.",
          'recently-deleted-intro',
          {
            label: 'View',
            onClick: () => setRecentlyDeletedViewMutation.mutate(),
          },
        );
      }
      return true;
    },
    [
      deleteSubtasksWithParent,
      deleteTaskMutation,
      hasSeenRecentlyDeletedToast,
      permanentDeleteTaskMutation,
      setHasSeenRecentlyDeletedToast,
      setRecentlyDeletedViewMutation,
      tasks,
    ],
  );

  return { confirmAndDelete };
};
