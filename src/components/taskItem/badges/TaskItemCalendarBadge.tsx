import type { MouseEvent } from 'react';
import { getIconByName } from '$constants/icons';
import type { Calendar } from '$types';

export const TaskItemCalendarBadge = ({
  calendar,
  calendarColor,
  onCalendarClick,
  readOnly = false,
}: {
  calendar: Calendar;
  calendarColor: string;
  onCalendarClick: (calendarId: string, event: MouseEvent) => void;
  readOnly?: boolean;
}) => {
  const CalendarIcon = getIconByName(calendar.icon || 'calendar');
  const content = (
    <>
      {calendar.emoji ? (
        <span className="text-xs leading-none" style={{ color: calendarColor }}>
          {calendar.emoji}
        </span>
      ) : (
        <CalendarIcon className="h-3 w-3" style={{ color: calendarColor }} />
      )}
      {calendar.displayName || 'Calendar'}
    </>
  );

  if (readOnly) {
    return (
      <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-sm border border-surface-200 bg-surface-100 px-2 py-0.5 font-medium text-surface-700 text-xs dark:border-surface-600 dark:bg-surface-700 dark:text-surface-300">
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onCalendarClick(calendar.id, e);
      }}
      className="inline-flex items-center gap-1 rounded-sm border border-surface-200 bg-surface-100 px-2 py-0.5 font-medium text-surface-700 text-xs outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:border-surface-600 dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
    >
      {content}
    </button>
  );
};
