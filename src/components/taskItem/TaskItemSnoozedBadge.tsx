import BellOff from 'lucide-react/icons/bell-off';
import X from 'lucide-react/icons/x';
import { clearSnoozed, useSnoozedUntil } from '$hooks/store/useSnoozedTasksStore';
import { formatTime } from '$utils/date';

export const TaskItemSnoozedBadge = ({ taskId }: { taskId: string }) => {
  const until = useSnoozedUntil(taskId);

  if (!until || until <= Date.now()) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
      <BellOff className="w-3 h-3" />
      Snoozed until {formatTime(new Date(until))}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          clearSnoozed(taskId);
        }}
        className="ml-0.5 rounded hover:bg-amber-200/60 dark:hover:bg-amber-800/60"
        aria-label="Cancel snooze"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
};
