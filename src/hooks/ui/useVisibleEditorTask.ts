import { useMemo } from 'react';
import { useUIState } from '$hooks/queries/useUIState';
import type { Task } from '$types/task/model';

export const useVisibleEditorTask = (tasks: Task[]) => {
  const { data: uiState } = useUIState();
  const isEditorOpen = uiState?.isEditorOpen ?? false;
  const selectedTaskId = uiState?.selectedTaskId ?? null;
  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const selectedTask = selectedTaskId ? (tasksById.get(selectedTaskId) ?? null) : null;

  return isEditorOpen ? selectedTask : null;
};
