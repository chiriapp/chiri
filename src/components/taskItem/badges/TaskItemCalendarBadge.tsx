import { getIconByName } from '$constants/icons';
import type { Calendar } from '$types';

export const TaskItemCalendarBadge = ({
  calendar,
  calendarColor,
  onCalendarClick,
}: {
  calendar: Calendar;
  calendarColor: string;
  onCalendarClick: (calendarId: string) => void;
}) => {
  const CalendarIcon = getIconByName(calendar.icon || 'calendar');
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onCalendarClick(calendar.id);
      }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium border hover:opacity-80 transition-opacity outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
      style={{
        borderColor: calendarColor,
        backgroundColor: `${calendarColor}15`,
        color: calendarColor,
      }}
    >
      {calendar.emoji ? (
        <span className="text-xs leading-none">{calendar.emoji}</span>
      ) : (
        <CalendarIcon className="w-3 h-3" />
      )}
      {calendar.displayName || 'Calendar'}
    </button>
  );
};
