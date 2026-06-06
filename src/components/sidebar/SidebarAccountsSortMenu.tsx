import ChevronRight from 'lucide-react/icons/chevron-right';
import type { RefObject } from 'react';
import { FloatingDropdownFrame } from '$components/FloatingDropdownFrame';
import { HoverFlyout, HoverFlyoutGroup } from '$components/HoverFlyout';
import { SidebarSortDirectionButton } from '$components/sidebar/SidebarSortDirectionButton';
import { ACCOUNT_SORT_OPTIONS, CALENDAR_SORT_OPTIONS } from '$constants';
import { useSetAccountSortConfig, useSetCalendarSortConfig } from '$hooks/queries/useUIState';
import type { AccountSortConfig, CalendarSortConfig } from '$types/sort';

interface SidebarAccountsSortMenuProps {
  anchorRef: RefObject<HTMLElement | null>;
  accountSortConfig: AccountSortConfig;
  calendarSortConfig: CalendarSortConfig;
  onClose: () => void;
}

export const SidebarAccountsSortMenu = ({
  anchorRef,
  accountSortConfig,
  calendarSortConfig,
  onClose,
}: SidebarAccountsSortMenuProps) => {
  const setAccountSortConfigMutation = useSetAccountSortConfig();
  const setCalendarSortConfigMutation = useSetCalendarSortConfig();

  const handleAccountSortModeChange = (mode: AccountSortConfig['mode']) => {
    setAccountSortConfigMutation.mutate({ ...accountSortConfig, mode });
  };

  const toggleAccountSortDirection = () => {
    setAccountSortConfigMutation.mutate({
      ...accountSortConfig,
      direction: accountSortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const handleCalendarSortModeChange = (mode: CalendarSortConfig['mode']) => {
    setCalendarSortConfigMutation.mutate({ ...calendarSortConfig, mode });
  };

  const toggleCalendarSortDirection = () => {
    setCalendarSortConfigMutation.mutate({
      ...calendarSortConfig,
      direction: calendarSortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  return (
    <FloatingDropdownFrame
      anchorRef={anchorRef}
      onClose={onClose}
      dropdownClassName="z-50 min-w-60"
      fallbackWidth={240}
      dataAttribute="data-context-menu-content"
    >
      <div className="py-2 space-y-1">
        <div className="px-3 pb-1 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
          Accounts
        </div>

        <HoverFlyoutGroup>
          <button
            type="button"
            className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-sm text-surface-700 dark:text-surface-300 transition-colors outline-hidden hover:bg-surface-100 dark:hover:bg-surface-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <span>Sort Direction</span>
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-xs text-surface-500 dark:text-surface-400">
                {accountSortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-surface-400" />
            </div>
          </button>

          <HoverFlyout side="right">
            <div className="px-3 pb-1 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              Sort Direction
            </div>
            <SidebarSortDirectionButton
              direction={accountSortConfig.direction}
              disabled={accountSortConfig.mode === 'manual'}
              onToggle={toggleAccountSortDirection}
            />
          </HoverFlyout>
        </HoverFlyoutGroup>

        <HoverFlyoutGroup>
          <button
            type="button"
            className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-sm text-surface-700 dark:text-surface-300 transition-colors outline-hidden hover:bg-surface-100 dark:hover:bg-surface-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <span>Sort By</span>
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-xs text-surface-500 dark:text-surface-400">
                {
                  ACCOUNT_SORT_OPTIONS.find((option) => option.value === accountSortConfig.mode)
                    ?.label
                }
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-surface-400" />
            </div>
          </button>

          <HoverFlyout side="right">
            <div className="px-3 pb-1 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              Sort By
            </div>
            <div className="space-y-1">
              {ACCOUNT_SORT_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => handleAccountSortModeChange(option.value)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                    accountSortConfig.mode === option.value
                      ? 'bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100'
                      : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
                  }`}
                >
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </HoverFlyout>
        </HoverFlyoutGroup>

        <div className="px-3 pb-1 pt-3 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
          Calendars
        </div>

        <HoverFlyoutGroup>
          <button
            type="button"
            className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-sm text-surface-700 dark:text-surface-300 transition-colors outline-hidden hover:bg-surface-100 dark:hover:bg-surface-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <span>Sort Direction</span>
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-xs text-surface-500 dark:text-surface-400">
                {calendarSortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-surface-400" />
            </div>
          </button>

          <HoverFlyout side="right">
            <div className="px-3 pb-1 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              Sort Direction
            </div>
            <SidebarSortDirectionButton
              direction={calendarSortConfig.direction}
              disabled={calendarSortConfig.mode === 'manual'}
              onToggle={toggleCalendarSortDirection}
            />
          </HoverFlyout>
        </HoverFlyoutGroup>

        <HoverFlyoutGroup>
          <button
            type="button"
            className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-sm text-surface-700 dark:text-surface-300 transition-colors outline-hidden hover:bg-surface-100 dark:hover:bg-surface-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <span>Sort By</span>
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-xs text-surface-500 dark:text-surface-400">
                {
                  CALENDAR_SORT_OPTIONS.find((option) => option.value === calendarSortConfig.mode)
                    ?.label
                }
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-surface-400" />
            </div>
          </button>

          <HoverFlyout side="right">
            <div className="px-3 pb-1 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              Sort By
            </div>
            <div className="space-y-1">
              {CALENDAR_SORT_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => handleCalendarSortModeChange(option.value)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                    calendarSortConfig.mode === option.value
                      ? 'bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100'
                      : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
                  }`}
                >
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </HoverFlyout>
        </HoverFlyoutGroup>
      </div>
    </FloatingDropdownFrame>
  );
};
