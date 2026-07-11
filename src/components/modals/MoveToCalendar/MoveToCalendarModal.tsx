import Search from 'lucide-react/icons/search';
import AlertTriangle from 'lucide-react/icons/triangle-alert';
import { useMemo, useState } from 'react';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { CalendarOption } from '$components/modals/MoveToCalendar/CalendarOption';
import { useInitialFocusRef } from '$hooks/ui/useInitialFocusRef';
import type { Account, Task } from '$types';

interface MoveToCalendarModalProps {
  task?: Task;
  accounts: Account[];
  onMove: (calendarId: string) => void;
  onClose: () => void;
  currentCalendarIds?: string[];
  title?: string;
  description?: string;
}

export const MoveToCalendarModal = ({
  task,
  accounts,
  onMove,
  onClose,
  currentCalendarIds,
  title = 'Move to Calendar',
  description,
}: MoveToCalendarModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useInitialFocusRef<HTMLInputElement>();

  const excludedCalendarIds = useMemo(() => {
    const ids = currentCalendarIds ?? (task ? [task.calendarId] : []);
    return ids.length === 1 ? new Set(ids) : new Set<string>();
  }, [currentCalendarIds, task]);

  const otherCalendars = useMemo(
    () =>
      accounts.flatMap((a) =>
        a.calendars
          .filter((c) => !excludedCalendarIds.has(c.id))
          .map((c) => ({ ...c, accountName: a.name })),
      ),
    [accounts, excludedCalendarIds],
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
      title={title}
      description={description}
      zIndex="z-60"
      className="max-w-sm"
      contentPadding={false}
      footer={
        <ModalButton variant="secondary" onClick={onClose}>
          Cancel
        </ModalButton>
      }
    >
      {task?.parentUid && (
        <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-semantic-warning/30 bg-semantic-warning/10 px-3 py-2 text-sm text-surface-700 dark:text-surface-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-semantic-warning" />
          <span>Changing the calendar will convert this subtask to a regular task.</span>
        </div>
      )}

      <div className="p-4 pb-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            ref={searchInputRef}
            placeholder="Search calendars..."
            className="w-full rounded-lg border border-transparent bg-surface-100 py-2 pr-3 pl-9 text-sm text-surface-800 transition-colors focus:border-primary-500 focus:bg-white focus:outline-hidden dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
          />
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto px-2 pt-1 pb-4">
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
    </ModalWrapper>
  );
};
