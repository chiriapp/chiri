import HardDrive from 'lucide-react/icons/hard-drive';
import Search from 'lucide-react/icons/search';
import { useMemo, useState } from 'react';
import { CalendarOption } from '$components/CalendarOption';
import { getIconByName } from '$constants/icons';
import { useInitialFocusRef } from '$hooks/ui/useInitialFocusRef';
import type { Account } from '$types/account';

interface CalendarPickerProps {
  accounts: Account[];
  selectedCalendarId?: string;
  excludedCalendarIds?: string[];
  onSelect: (accountId: string, calendarId: string) => void;
  emptyMessage: string;
}

export const CalendarPicker = ({
  accounts,
  selectedCalendarId,
  excludedCalendarIds = [],
  onSelect,
  emptyMessage,
}: CalendarPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useInitialFocusRef<HTMLInputElement>();

  const accountGroups = useMemo(() => {
    const excludedIds = new Set(excludedCalendarIds);
    return accounts
      .map((account) => ({
        account,
        calendars: account.calendars.filter((calendar) => !excludedIds.has(calendar.id)),
      }))
      .filter((group) => group.calendars.length > 0);
  }, [accounts, excludedCalendarIds]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return accountGroups;

    const query = searchQuery.toLowerCase();
    return accountGroups
      .map((group) => {
        const accountMatches = group.account.name.toLowerCase().includes(query);
        const calendars = accountMatches
          ? group.calendars
          : group.calendars.filter((calendar) =>
              calendar.displayName.toLowerCase().includes(query),
            );
        return { ...group, calendars };
      })
      .filter((group) => group.calendars.length > 0);
  }, [accountGroups, searchQuery]);

  return (
    <div>
      <div className="p-4 pb-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-surface-500 dark:text-surface-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            ref={searchInputRef}
            placeholder="Search calendars..."
            className="w-full rounded-lg border border-transparent bg-surface-100 py-2 pr-3 pl-9 text-sm text-surface-800 transition-colors focus:border-primary-ink focus:bg-white focus:outline-hidden dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
          />
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto px-2 pt-1 pb-4">
        {filteredGroups.length === 0 ? (
          <div className="p-4 text-center text-sm text-surface-500 dark:text-surface-400">
            {searchQuery.trim() ? 'No calendars match your search.' : emptyMessage}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGroups.map((group) => {
              const isLocal = group.account.caldav === null;
              const AccountIcon = isLocal ? HardDrive : getIconByName(group.account.icon || 'user');

              return (
                <div key={group.account.id}>
                  <div className="flex items-center gap-2 px-3 py-1.5 font-medium text-surface-500 text-xs dark:text-surface-400">
                    {group.account.emoji ? (
                      <span className="text-xs leading-none">{group.account.emoji}</span>
                    ) : (
                      <AccountIcon className="size-4 shrink-0" />
                    )}
                    <span className="truncate">{group.account.name}</span>
                  </div>
                  <div className="space-y-1">
                    {group.calendars.map((calendar) => (
                      <CalendarOption
                        key={calendar.id}
                        cal={calendar}
                        isSelected={calendar.id === selectedCalendarId}
                        onSelect={() => onSelect(group.account.id, calendar.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
