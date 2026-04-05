import CheckCircle2 from 'lucide-react/icons/check-circle-2';

export const TaskItemSubtaskProgressBadge = ({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-400">
    <CheckCircle2 className="w-3 h-3" />
    {completed}/{total}
  </span>
);
