import Loader from 'lucide-react/icons/loader';

export const TaskItemInProgressBadge = ({ percentComplete }: { percentComplete?: number }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium border border-surface-200 dark:border-surface-600 bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400">
    <Loader className="w-3 h-3 text-blue-500 dark:text-blue-400" />
    {percentComplete}%
  </span>
);
