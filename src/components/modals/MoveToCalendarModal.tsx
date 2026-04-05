import Search from 'lucide-react/icons/search';
import X from 'lucide-react/icons/x';
import { useMemo, useState } from 'react';
import { ModalBackdrop } from '$components/ModalBackdrop';
import { FALLBACK_ITEM_COLOR } from '$constants';
import { getIconByName } from '$constants/icons';
import { useFocusTrap } from '$hooks/ui/useFocusTrap';
import { useModalEscapeKey } from '$hooks/ui/useModalEscapeKey';
import type { Account, Task } from '$types';

type CalendarEntry = Account['calendars'][number] & { accountName: string };

interface CalendarOptionProps {
  cal: CalendarEntry;
  onMove: (calendarId: string) => void;
  onClose: () => void;
}

const CalendarOption = ({ cal, onMove, onClose }: CalendarOptionProps) => {
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
          style={{ color: cal.color ?? FALLBACK_ITEM_COLOR }}
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

interface MoveToCalendarModalProps {
  task: Task;
  accounts: Account[];
  onMove: (calendarId: string) => void;
  onClose: () => void;
}

export const MoveToCalendarModal = ({
  task,
  accounts,
  onMove,
  onClose,
}: MoveToCalendarModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const focusTrapRef = useFocusTrap(true);

  useModalEscapeKey(onClose);

  const otherCalendars = useMemo(
    () =>
      accounts.flatMap((a) =>
        a.calendars
          .filter((c) => c.id !== task.calendarId)
          .map((c) => ({ ...c, accountName: a.name })),
      ),
    [accounts, task.calendarId],
  );

  const filteredCalendars = useMemo(() => {
    if (!searchQuery.trim()) return otherCalendars;
    const q = searchQuery.toLowerCase();
    return otherCalendars.filter(
      (c) => c.displayName.toLowerCase().includes(q) || c.accountName.toLowerCase().includes(q),
    );
  }, [otherCalendars, searchQuery]);

  return (
    <ModalBackdrop zIndex="z-60">
      <div
        ref={focusTrapRef}
        className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-sm animate-scale-in relative"
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">
            Move to Calendar
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              ref={(el) => {
                if (el) setTimeout(() => el.focus(), 100);
              }}
              placeholder="Search calendars..."
              className="w-full pl-9 pr-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
            />
          </div>
        </div>

        <div className="p-2 max-h-72 overflow-y-auto">
          {filteredCalendars.length === 0 ? (
            <div className="p-4 text-center text-sm text-surface-500 dark:text-surface-400">
              {searchQuery.trim()
                ? 'No calendars match your search.'
                : 'No other calendars available.'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCalendars.map((cal) => (
                <CalendarOption key={cal.id} cal={cal} onMove={onMove} onClose={onClose} />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end p-3 border-t border-surface-200 dark:border-surface-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
};
