import type { Status, Task } from '$types/task/model';

type CurrentTaskState = Pick<Task, 'percentComplete' | 'completedAt'>;

/**
 * a task that still shows up as work to do: not deleted, completed or cancelled
 */
export const isActiveTask = (task: Pick<Task, 'deletedAt' | 'status'>) =>
  !task.deletedAt && task.status !== 'completed' && task.status !== 'cancelled';

export const getPercentCompleteForStatus = (
  status: Status,
  currentPercentComplete?: number,
): number | undefined => {
  if (status === 'completed') return 100;
  if (status === 'in-process') {
    return currentPercentComplete !== undefined &&
      currentPercentComplete >= 1 &&
      currentPercentComplete <= 99
      ? currentPercentComplete
      : 1;
  }
  if (status === 'cancelled') return currentPercentComplete;
  return 0;
};

export const getTaskStatusAfterCompletionToggle = (
  status: Status,
  completeInProcess = false,
): Status => {
  if (status === 'completed') return 'needs-action';
  if (status === 'cancelled' || (status === 'in-process' && !completeInProcess)) {
    return 'needs-action';
  }
  return 'completed';
};

export const getNewTaskPercentComplete = (
  taskStatus: Status | undefined,
  taskPercentComplete: number | undefined,
  defaultStatus: Status,
  defaultPercentComplete: number,
  syncStatusProgress = true,
) =>
  taskPercentComplete ??
  (syncStatusProgress && taskStatus === undefined
    ? (getPercentCompleteForStatus(defaultStatus, defaultPercentComplete) ?? 0)
    : defaultPercentComplete);

export const buildStatusUpdates = (
  status: Status,
  current: CurrentTaskState,
  now = new Date(),
  syncStatusProgress = true,
): Pick<Task, 'status' | 'completed' | 'completedAt'> & Partial<Pick<Task, 'percentComplete'>> => {
  const updates = {
    status,
    completed: status === 'completed',
    completedAt: status === 'completed' ? (current.completedAt ?? now) : undefined,
  };

  return syncStatusProgress
    ? { ...updates, percentComplete: getPercentCompleteForStatus(status, current.percentComplete) }
    : updates;
};

export const buildProgressUpdates = (
  percentComplete: number,
  current: CurrentTaskState,
  now = new Date(),
  syncStatusProgress = true,
): Pick<Task, 'percentComplete'> & Partial<Pick<Task, 'status' | 'completed' | 'completedAt'>> => {
  const normalizedPercent = Math.max(0, Math.min(100, percentComplete));
  if (!syncStatusProgress) return { percentComplete: normalizedPercent };

  const status: Status =
    normalizedPercent === 100
      ? 'completed'
      : normalizedPercent >= 1
        ? 'in-process'
        : 'needs-action';

  return {
    ...buildStatusUpdates(status, current, now, true),
    percentComplete: normalizedPercent,
  };
};
