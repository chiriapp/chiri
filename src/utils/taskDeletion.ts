import type { Task } from '$types';

const hasRecoverableTaskDetails = (task: Task, allTasks: Task[]) =>
  task.description.trim().length > 0 ||
  task.status !== 'needs-action' ||
  task.completed ||
  !!task.completedAt ||
  (task.percentComplete ?? 0) > 0 ||
  task.priority !== 'none' ||
  (task.tags ?? []).length > 0 ||
  !!task.categoryId?.trim() ||
  !!task.startDate ||
  !!task.dueDate ||
  (task.reminders ?? []).length > 0 ||
  !!task.url?.trim() ||
  !!task.rrule?.trim() ||
  task.repeatFrom === 1 ||
  allTasks.some((candidate) => candidate.parentUid === task.uid);

export const isDiscardableUntitledLocalDraft = (task: Task, allTasks: Task[] = []) => {
  if (task.title.trim() || task.href) return false;
  if (hasRecoverableTaskDetails(task, allTasks)) return false;

  return task.createdAt.getTime() === task.modifiedAt.getTime();
};
