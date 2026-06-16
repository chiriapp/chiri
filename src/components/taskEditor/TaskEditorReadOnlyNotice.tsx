import Info from 'lucide-react/icons/info';
import type { Task } from '$types';
import { formatDate } from '$utils/date';
import { getRecentlyDeletedExpirationDate } from '$utils/taskDeletion';

interface TaskEditorReadOnlyNoticeProps {
  task: Task;
}

export const TaskEditorReadOnlyNotice = ({ task }: TaskEditorReadOnlyNoticeProps) => {
  if (!task.deletedAt) {
    return null;
  }

  const expiresAt = getRecentlyDeletedExpirationDate(new Date(task.deletedAt));

  return (
    <div className="flex items-start gap-2 rounded-lg border border-semantic-info/30 bg-semantic-info/10 px-3 py-2 text-sm text-surface-700 dark:text-surface-300">
      <Info className="mt-0.5 size-4 shrink-0 text-semantic-info" />
      <p>
        {task.parentUid ? 'This subtask is read-only.' : 'This task is read-only.'} Restore it to
        make changes. It will be permanently deleted on {formatDate(expiresAt, true)}.
      </p>
    </div>
  );
};
