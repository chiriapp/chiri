import CalendarClock from 'lucide-react/icons/calendar-clock';
import type { formatStartDate } from '$utils/date';

export const TaskItemStartDateBadge = ({
  startDateDisplay,
}: {
  startDateDisplay: ReturnType<typeof formatStartDate>;
}) => (
  <span
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium border"
    style={{
      borderColor: startDateDisplay.borderColor,
      backgroundColor: startDateDisplay.bgColor,
      color: startDateDisplay.textColor,
    }}
  >
    <CalendarClock className="w-3 h-3" />
    {startDateDisplay.text}
  </span>
);
