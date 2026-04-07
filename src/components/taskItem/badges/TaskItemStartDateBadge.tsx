import CalendarClock from 'lucide-react/icons/calendar-clock';
import type { formatStartDate } from '$utils/date';

export const TaskItemStartDateBadge = ({
  startDateDisplay,
}: {
  startDateDisplay: ReturnType<typeof formatStartDate>;
}) => (
  <span
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium border bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400"
    style={{ borderColor: startDateDisplay.borderColor }}
  >
    <CalendarClock className="w-3 h-3" style={{ color: startDateDisplay.borderColor }} />
    {startDateDisplay.text}
  </span>
);
