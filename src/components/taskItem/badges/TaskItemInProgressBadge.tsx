import Loader from 'lucide-react/icons/loader';

export const TaskItemInProgressBadge = ({ percentComplete }: { percentComplete?: number }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium border border-status-in-process/30 bg-status-in-process/10 text-status-in-process">
    <Loader className="w-3 h-3 text-status-in-process" />
    {percentComplete}%
  </span>
);
