import { RECENTLY_DELETED_RETENTION_DAYS } from '$constants';
import type { Task } from '$types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

export const getRecentlyDeletedExpirationDate = (
  deletedAt: Date,
  retentionDays = RECENTLY_DELETED_RETENTION_DAYS,
) => new Date(deletedAt.getTime() + retentionDays * MS_PER_DAY);

export const getRecentlyDeletedRetentionCutoff = (
  now: Date = new Date(),
  retentionDays = RECENTLY_DELETED_RETENTION_DAYS,
) => new Date(now.getTime() - retentionDays * MS_PER_DAY);

export const getRecentlyDeletedDaysRemaining = (
  deletedAt: Date,
  now: Date = new Date(),
  retentionDays = RECENTLY_DELETED_RETENTION_DAYS,
) => {
  const expiresAt = getRecentlyDeletedExpirationDate(deletedAt, retentionDays);
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / MS_PER_DAY));
};

export const isExpiredRecentlyDeletedTask = (
  task: Task,
  now: Date = new Date(),
  retentionDays = RECENTLY_DELETED_RETENTION_DAYS,
) =>
  !!task.deletedAt &&
  task.deletedAt.getTime() <= getRecentlyDeletedRetentionCutoff(now, retentionDays).getTime();
