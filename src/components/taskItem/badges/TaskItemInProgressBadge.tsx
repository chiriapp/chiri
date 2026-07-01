import Timer from 'lucide-react/icons/timer';

export const TaskItemInProgressBadge = ({ percentComplete }: { percentComplete?: number }) => (
  <span className="inline-flex items-center gap-1 rounded-sm border border-status-in-process/30 bg-status-in-process/10 px-2 py-0.5 font-medium text-status-in-process text-xs">
    <Timer className="h-3 w-3 text-status-in-process" />
    {percentComplete}%
  </span>
);
