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
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium border border-surface-200 dark:border-surface-600 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:opacity-80 transition-opacity outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
    >
      {calendar.emoji ? (
        <span className="text-xs leading-none" style={{ color: calendarColor }}>
          {calendar.emoji}
        </span>
      ) : (
        <CalendarIcon className="w-3 h-3" style={{ color: calendarColor }} />
      )}
      {calendar.displayName || 'Calendar'}
    </button>
  );
};
