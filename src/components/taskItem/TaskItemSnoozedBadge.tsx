import BellOff from 'lucide-react/icons/bell-off';
import X from 'lucide-react/icons/x';
import { clearSnoozed, useSnoozedUntil } from '$hooks/store/useSnoozedTasksStore';
import { formatTime } from '$utils/date';

export const TaskItemSnoozedBadge = ({ taskId }: { taskId: string }) => {
  const until = useSnoozedUntil(taskId);

  if (!until || until <= Date.now()) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border text-semantic-warning bg-semantic-warning/15 border-semantic-warning">
      <BellOff className="w-3 h-3" />
      Snoozed until {formatTime(new Date(until))}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          clearSnoozed(taskId);
        }}
        className="ml-0.5 rounded hover:bg-semantic-warning/20"
        aria-label="Cancel snooze"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
};
