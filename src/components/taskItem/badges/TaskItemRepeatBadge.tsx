import RefreshCw from 'lucide-react/icons/refresh-cw';

export const TaskItemRepeatBadge = () => (
  <span
    title="Repeating task"
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-400"
  >
    <RefreshCw className="w-3 h-3" />
  </span>
);
