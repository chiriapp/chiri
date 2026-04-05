import Loader from 'lucide-react/icons/loader';

export const TaskItemInProgressBadge = ({ percentComplete }: { percentComplete?: number }) => (
  <span
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium border"
    style={{
      borderColor: '#3b82f6',
      backgroundColor: '#3b82f615',
      color: '#3b82f6',
    }}
  >
    <Loader className="w-3 h-3" />
    {percentComplete}%
  </span>
);
