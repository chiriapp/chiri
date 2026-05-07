import { getFallbackItemColor } from '$constants/colorSchemes';
import { getIconByName } from '$constants/icons';
import type { Account } from '$types';

export type CalendarEntry = Account['calendars'][number] & { accountName: string };

interface MoveToCalendarOptionProps {
  cal: CalendarEntry;
  onMove: (calendarId: string) => void;
  onClose: () => void;
}

export const MoveToCalendarOption = ({ cal, onMove, onClose }: MoveToCalendarOptionProps) => {
  const CalIcon = getIconByName(cal.icon || 'calendar');
  return (
    <button
      type="button"
      onClick={() => {
        onMove(cal.id);
        onClose();
      }}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset hover:bg-surface-100 dark:hover:bg-surface-700"
    >
      {cal.emoji ? (
        <span className="text-base leading-none">{cal.emoji}</span>
      ) : (
        <CalIcon
          className="w-4 h-4 shrink-0"
          style={{ color: cal.color ?? getFallbackItemColor() }}
        />
      )}
      <div className="flex-1 text-left min-w-0">
        <div className="truncate font-medium text-surface-700 dark:text-surface-300">
          {cal.displayName || 'Calendar'}
        </div>
        <div className="text-xs text-surface-400 dark:text-surface-500 truncate">
          {cal.accountName}
        </div>
      </div>
    </button>
  );
};
