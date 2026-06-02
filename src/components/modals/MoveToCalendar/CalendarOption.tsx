import { getIconByName } from '$constants/icons';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import type { Account } from '$types';

interface CalendarOptionProps {
  cal: Account['calendars'][number] & { accountName: string };
  onMove: (calendarId: string) => void;
  onClose: () => void;
}

const calendarOptionButtonClass =
  "relative w-full text-sm rounded-lg transition-colors outline-hidden before:content-[''] before:pointer-events-none before:absolute before:inset-y-0 before:left-1.5 before:right-1.5 before:rounded-lg before:transition-colors hover:before:bg-surface-100 dark:hover:before:bg-surface-700 focus-visible:before:ring-2 focus-visible:before:ring-primary-500 focus-visible:before:ring-inset";
const calendarOptionContentClass = 'relative z-10 flex items-center gap-3 px-3 py-2.5';

export const CalendarOption = ({ cal, onMove, onClose }: CalendarOptionProps) => {
  const resolveAccent = useAccentColorResolver();
  const resolvedAccentColor = useResolvedAccentColor();
  const CalIcon = getIconByName(cal.icon || 'calendar');
  const calendarColor = cal.color ? resolveAccent(cal.color) : resolvedAccentColor;
  return (
    <button
      type="button"
      onClick={() => {
        onMove(cal.id);
        onClose();
      }}
      className={calendarOptionButtonClass}
    >
      <span className={calendarOptionContentClass}>
        {cal.emoji ? (
          <span className="text-base leading-none">{cal.emoji}</span>
        ) : (
          <CalIcon className="w-4 h-4 shrink-0" style={{ color: calendarColor }} />
        )}
        <div className="flex-1 text-left min-w-0">
          <div className="truncate font-medium text-surface-700 dark:text-surface-300">
            {cal.displayName || 'Calendar'}
          </div>
          <div className="text-xs text-surface-400 dark:text-surface-500 truncate">
            {cal.accountName}
          </div>
        </div>
      </span>
    </button>
  );
};
