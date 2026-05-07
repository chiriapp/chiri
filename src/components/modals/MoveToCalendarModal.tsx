import Search from 'lucide-react/icons/search';
import { useMemo, useState } from 'react';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { MoveToCalendarOption } from '$components/modals/MoveToCalendarOption';
import type { Account, Task } from '$types';

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
    <ModalWrapper
      onClose={onClose}
      title="Move to Calendar"
      zIndex="z-60"
      className="max-w-sm"
      footer={
        <ModalButton variant="secondary" onClick={onClose}>
          Cancel
        </ModalButton>
      }
    >
      <div className="px-4 pt-3 pb-2 -mx-4 -mt-4">
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
            className="w-full pl-9 pr-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
          />
        </div>
      </div>

      <div className="-mx-4 p-2 max-h-72 overflow-y-auto">
        {filteredCalendars.length === 0 ? (
          <div className="p-4 text-center text-sm text-surface-500 dark:text-surface-400">
            {searchQuery.trim()
              ? 'No calendars match your search.'
              : 'No other calendars available.'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredCalendars.map((cal) => (
              <MoveToCalendarOption key={cal.id} cal={cal} onMove={onMove} onClose={onClose} />
            ))}
          </div>
        )}
      </div>
    </ModalWrapper>
  );
};
