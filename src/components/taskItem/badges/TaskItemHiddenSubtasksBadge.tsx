import { pluralize } from '$utils/misc';

export const TaskItemHiddenSubtasksBadge = ({ count }: { count: number }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium border border-surface-300 dark:border-surface-600 bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400">
    {count} hidden {pluralize(count, 'subtask')}
  </span>
);
