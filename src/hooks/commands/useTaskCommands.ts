import { useCallback } from 'react';
import { useModalState } from '$context/modalStateContext';
import { useTaskSelection } from '$context/taskSelectionContext';
import { useTaskDeletion } from '$hooks/deletion/useTaskDeletion';
import { useCreateTask } from '$hooks/queries/useTasks';
import { useSetEditorOpen, useSetSelectedTask, useUIState } from '$hooks/queries/useUIState';
import { useVisibleTasks } from '$hooks/queries/useVisibleTasks';
import type { AppModals } from '$types/controller';

interface UseTaskCommandsOptions {
  modals: AppModals;
}

export const useTaskCommands = ({ modals }: UseTaskCommandsOptions) => {
  const createTaskMutation = useCreateTask();
  const setSelectedTaskMutation = useSetSelectedTask();
  const { data: uiState } = useUIState();
  const { isAnyModalOpen } = useModalState();
  const { moveTaskToRecentlyDeleted } = useTaskDeletion();

  const { selectedTaskIds, setSelection, clearSelection } = useTaskSelection();
  const flattenedTasks = useVisibleTasks();
  const setEditorOpenMutation = useSetEditorOpen();

  const newTask = useCallback(() => {
    createTaskMutation.mutate(
      { title: '' },
      {
        onSuccess: (task) => {
          setSelectedTaskMutation.mutate({ id: task.id, focusTitle: true });
        },
      },
    );
  }, [createTaskMutation, setSelectedTaskMutation]);

  const deleteTask = useCallback(async () => {
    if (uiState?.activeView === 'recently-deleted') return;
    const selectedTaskId = uiState?.selectedTaskId ?? null;
    if (selectedTaskId) {
      await moveTaskToRecentlyDeleted(selectedTaskId);
    }
  }, [uiState?.activeView, uiState?.selectedTaskId, moveTaskToRecentlyDeleted]);

  const selectAll = useCallback(() => {
    if (flattenedTasks.length === 0) return;

    if (selectedTaskIds.length > 0) {
      clearSelection();
      return;
    }

    setEditorOpenMutation.mutate(false);
    setSelection(
      flattenedTasks.map((task) => task.id),
      flattenedTasks[0].id,
    );
  }, [clearSelection, flattenedTasks, selectedTaskIds.length, setEditorOpenMutation, setSelection]);

  const openTaskActions = useCallback(
    (taskId: string) => {
      if (isAnyModalOpen) return;
      modals.openTaskActions(taskId);
    },
    [isAnyModalOpen, modals],
  );

  return {
    newTask,
    deleteTask,
    selectAll,
    openTaskActions,
  };
};
