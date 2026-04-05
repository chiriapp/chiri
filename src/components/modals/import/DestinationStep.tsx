import Calendar from 'lucide-react/icons/calendar';
import Check from 'lucide-react/icons/check';
import ChevronDown from 'lucide-react/icons/chevron-down';
import Cloud from 'lucide-react/icons/cloud';
import { useEffect, useRef, useState } from 'react';
import type { DestinationStepProps } from '$types/import';

interface CalendarOption {
  accountId: string;
  accountName: string;
  calendarId: string;
  calendarName: string;
  calendarColor?: string;
}

export const DestinationStep = ({
  accounts,
  selectedAccountId,
  selectedCalendarId,
  onSelect,
}: DestinationStepProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build flat list of calendar options grouped by account
  const calendarOptions: CalendarOption[] = accounts.flatMap((account) =>
    account.calendars.map((cal) => ({
      accountId: account.id,
      accountName: account.name,
      calendarId: cal.id,
      calendarName: cal.displayName,
      calendarColor: cal.color,
    })),
  );

  // Find currently selected option
  const selectedOption = calendarOptions.find(
    (opt) => opt.accountId === selectedAccountId && opt.calendarId === selectedCalendarId,
  );

  // Group calendars by account for display
  const groupedOptions = accounts.map((account) => ({
    account,
    calendars: account.calendars,
  }));

  const handleSelect = (accountId: string, calendarId: string) => {
    onSelect(accountId, calendarId);
    setIsOpen(false);
  };

  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const openDropdown = () => {
    updateDropdownPosition();
    setIsOpen(true);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeDropdown();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleDropdown();
    } else if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      openDropdown();
    }
  };

  const hasAccounts = accounts.length > 0;
  const hasCalendars = calendarOptions.length > 0;

  if (!hasAccounts) {
    return (
      <div className="p-4 text-center text-sm text-surface-500 dark:text-surface-400 bg-surface-50 dark:bg-surface-700/50 rounded-lg border border-surface-200 dark:border-surface-600">
        <Cloud className="w-8 h-8 mx-auto mb-2 text-surface-400" />
        <p className="font-medium text-surface-600 dark:text-surface-300">No accounts configured</p>
        <p className="text-xs mt-1">Add a CalDAV account first to import tasks.</p>
      </div>
    );
  }

  if (!hasCalendars) {
    return (
      <div className="p-4 text-center text-sm text-surface-500 dark:text-surface-400 bg-surface-50 dark:bg-surface-700/50 rounded-lg border border-surface-200 dark:border-surface-600">
        <Calendar className="w-8 h-8 mx-auto mb-2 text-surface-400" />
        <p className="font-medium text-surface-600 dark:text-surface-300">No calendars available</p>
        <p className="text-xs mt-1">Your accounts don't have any task lists yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-surface-700 dark:text-surface-300">
        Import to
      </span>

      {/* Custom dropdown */}
      <div ref={containerRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleDropdown}
          onKeyDown={handleKeyDown}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left rounded-lg border transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 ${
            isOpen
              ? 'border-primary-500 ring-2 ring-primary-500/20 bg-white dark:bg-surface-700'
              : 'border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 hover:border-surface-300 dark:hover:border-surface-500'
          }`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {selectedOption ? (
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: selectedOption.calendarColor || '#3b82f6' }}
              />
              <span className="truncate text-surface-800 dark:text-surface-200">
                {selectedOption.calendarName}
              </span>
              <span className="text-xs text-surface-500 dark:text-surface-400 shrink-0">
                ({selectedOption.accountName})
              </span>
            </div>
          ) : (
            <span className="text-surface-500 dark:text-surface-400">Select a calendar...</span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-surface-400 shrink-0 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown menu - use fixed positioning to avoid modal overflow issues */}
        {isOpen && dropdownPosition && (
          <div
            ref={listRef}
            role="listbox"
            className="fixed z-70 py-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-lg shadow-lg max-h-64 overflow-y-auto animate-fade-in"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
          >
            {groupedOptions.map(({ account, calendars }) => (
              <div key={account.id}>
                {/* Account header */}
                <div className="px-3 py-1.5 text-xs font-medium text-surface-500 dark:text-surface-400 bg-surface-50 dark:bg-surface-700/50 sticky top-0">
                  {account.name}
                </div>

                {/* Calendars */}
                {calendars.map((cal) => {
                  const isSelected =
                    selectedAccountId === account.id && selectedCalendarId === cal.id;
                  return (
                    <button
                      key={cal.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(account.id, cal.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                        isSelected
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'hover:bg-surface-50 dark:hover:bg-surface-700/50 text-surface-700 dark:text-surface-300'
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cal.color || '#3b82f6' }}
                      />
                      <span className="truncate flex-1">{cal.displayName}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selection summary */}
      {selectedOption && (
        <p className="text-xs text-surface-500 dark:text-surface-400">
          Tasks will be added to the "{selectedOption.calendarName}" calendar in your{' '}
          {selectedOption.accountName} account.
        </p>
      )}
    </div>
  );
};
