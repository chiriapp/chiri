import Calendar from 'lucide-react/icons/calendar';
import Check from 'lucide-react/icons/check';
import ChevronDown from 'lucide-react/icons/chevron-down';
import Cloud from 'lucide-react/icons/cloud';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useDismissableLayer } from '$hooks/ui/useDismissableLayer';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import type { Account } from '$types';

interface CalendarOption {
  accountId: string;
  accountName: string;
  calendarId: string;
  calendarName: string;
  calendarColor?: string;
}

interface DestinationStepProps {
  accounts: Account[];
  selectedAccountId: string;
  selectedCalendarId: string;
  onSelect: (accountId: string, calendarId: string) => void;
}

export const DestinationStep = ({
  accounts,
  selectedAccountId,
  selectedCalendarId,
  onSelect,
}: DestinationStepProps) => {
  const resolveAccent = useAccentColorResolver();
  const resolvedAccentColor = useResolvedAccentColor();
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
  const selectedCalendarColor = selectedOption
    ? selectedOption.calendarColor
      ? resolveAccent(selectedOption.calendarColor)
      : resolvedAccentColor
    : resolvedAccentColor;

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

  useDismissableLayer({
    enabled: isOpen,
    type: 'dropdown',
    priority: 70,
    onEscape: closeDropdown,
  });

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
  const handleKeyDown = (e: KeyboardEvent) => {
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
      <div className="rounded-lg border border-surface-200 bg-surface-50 p-4 text-center text-sm text-surface-500 dark:border-surface-600 dark:bg-surface-700/50 dark:text-surface-400">
        <Cloud className="mx-auto mb-2 h-8 w-8 text-surface-400" />
        <p className="font-medium text-surface-600 dark:text-surface-300">No accounts configured</p>
        <p className="mt-1 text-xs">Add a CalDAV account first to import tasks.</p>
      </div>
    );
  }

  if (!hasCalendars) {
    return (
      <div className="rounded-lg border border-surface-200 bg-surface-50 p-4 text-center text-sm text-surface-500 dark:border-surface-600 dark:bg-surface-700/50 dark:text-surface-400">
        <Calendar className="mx-auto mb-2 h-8 w-8 text-surface-400" />
        <p className="font-medium text-surface-600 dark:text-surface-300">No calendars available</p>
        <p className="mt-1 text-xs">Your accounts don't have any task lists yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className="block font-medium text-sm text-surface-700 dark:text-surface-300">
        Import to
      </span>

      {/* Custom dropdown */}
      <div ref={containerRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleDropdown}
          onKeyDown={handleKeyDown}
          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 ${
            isOpen
              ? 'border-primary-500 bg-white ring-2 ring-primary-500/20 dark:bg-surface-700'
              : 'border-surface-200 bg-white hover:border-surface-300 dark:border-surface-600 dark:bg-surface-700 dark:hover:border-surface-500'
          }`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {selectedOption ? (
            <div className="flex min-w-0 items-center gap-2">
              <div
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: selectedCalendarColor }}
              />
              <span className="truncate text-surface-800 dark:text-surface-200">
                {selectedOption.calendarName}
              </span>
              <span className="shrink-0 text-surface-500 text-xs dark:text-surface-400">
                ({selectedOption.accountName})
              </span>
            </div>
          ) : (
            <span className="text-surface-500 dark:text-surface-400">Select a calendar...</span>
          )}
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-surface-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown menu - use fixed positioning to avoid modal overflow issues */}
        {isOpen && dropdownPosition && (
          <div
            ref={listRef}
            role="listbox"
            className="fixed z-70 max-h-64 animate-fade-in overflow-y-auto rounded-lg border border-surface-200 bg-white py-1 shadow-lg dark:border-surface-600 dark:bg-surface-800"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
          >
            {groupedOptions.map(({ account, calendars }) => (
              <div key={account.id}>
                {/* Account header */}
                <div className="sticky top-0 bg-surface-50 px-3 py-1.5 font-medium text-surface-500 text-xs dark:bg-surface-700/50 dark:text-surface-400">
                  {account.name}
                </div>

                {/* Calendars */}
                {calendars.map((cal) => {
                  const isSelected =
                    selectedAccountId === account.id && selectedCalendarId === cal.id;
                  const calendarColor = cal.color ? resolveAccent(cal.color) : resolvedAccentColor;
                  return (
                    <button
                      key={cal.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(account.id, cal.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                        isSelected
                          ? 'bg-surface-200 text-surface-900 dark:bg-surface-700 dark:text-surface-100'
                          : 'text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-700/50'
                      }`}
                    >
                      <div
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: calendarColor }}
                      />
                      <span className="flex-1 truncate">{cal.displayName}</span>
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-primary-500" />}
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
        <p className="text-surface-500 text-xs dark:text-surface-400">
          Tasks will be added to the "{selectedOption.calendarName}" calendar in your{' '}
          {selectedOption.accountName} account.
        </p>
      )}
    </div>
  );
};
