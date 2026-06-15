import ChevronRight from 'lucide-react/icons/chevron-right';
import type { RefObject } from 'react';
import { FloatingDropdownFrame } from '$components/FloatingDropdownFrame';
import { HoverFlyout, HoverFlyoutGroup } from '$components/HoverFlyout';
import { SidebarSortDirectionButton } from '$components/sidebar/SidebarSortDirectionButton';
import { Tooltip } from '$components/Tooltip';
import { CALENDAR_SORT_OPTIONS } from '$constants';
import { useSetCalendarSortConfig } from '$hooks/queries/useUIState';
import type { CalendarSortConfig } from '$types/sort';

interface SidebarLocalSortMenuProps {
  anchorRef: RefObject<HTMLElement | null>;
  calendarSortConfig: CalendarSortConfig;
  onClose: () => void;
}

export const SidebarLocalSortMenu = ({
  anchorRef,
  calendarSortConfig,
  onClose,
}: SidebarLocalSortMenuProps) => {
  const setCalendarSortConfigMutation = useSetCalendarSortConfig();

  const handleSortModeChange = (mode: CalendarSortConfig['mode']) => {
    setCalendarSortConfigMutation.mutate({ ...calendarSortConfig, mode });
  };

  const toggleSortDirection = () => {
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
      <div className="space-y-1 px-1 py-2">
        <div className="px-3 pt-1 pb-1 font-medium text-surface-500 text-xs uppercase tracking-wider dark:text-surface-400">
          Local Calendars
        </div>

        {calendarSortConfig.mode === 'manual' ? (
          <Tooltip
            content="Not available for manual sorting"
            position="right"
            className="whitespace-nowrap"
            triggerClassName="w-full"
            allowInModal
          >
            <div className="flex w-full cursor-not-allowed items-center justify-between gap-3 rounded-md px-3 py-1.5 text-sm text-surface-400 dark:text-surface-600">
              <span>Sort Direction</span>
              <span className="text-xs">Disabled</span>
            </div>
          </Tooltip>
        ) : (
          <HoverFlyoutGroup>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-300 dark:hover:bg-surface-700"
            >
              <span>Sort Direction</span>
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-surface-500 text-xs dark:text-surface-400">
                  {calendarSortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-surface-400" />
              </div>
            </button>

            <HoverFlyout side="right">
              <div className="px-3 pt-1 pb-1 font-medium text-surface-500 text-xs uppercase tracking-wider dark:text-surface-400">
                Sort Direction
              </div>
              <div className="px-1">
                <SidebarSortDirectionButton
                  direction={calendarSortConfig.direction}
                  disabled={false}
                  onToggle={toggleSortDirection}
                />
              </div>
            </HoverFlyout>
          </HoverFlyoutGroup>
        )}

        <HoverFlyoutGroup>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-300 dark:hover:bg-surface-700"
          >
            <span>Sort By</span>
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-surface-500 text-xs dark:text-surface-400">
                {
                  CALENDAR_SORT_OPTIONS.find((option) => option.value === calendarSortConfig.mode)
                    ?.label
                }
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-surface-400" />
            </div>
          </button>

          <HoverFlyout side="right">
            <div className="px-3 pt-1 pb-1 font-medium text-surface-500 text-xs uppercase tracking-wider dark:text-surface-400">
              Sort By
            </div>
            <div className="space-y-1 px-1">
              {CALENDAR_SORT_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => handleSortModeChange(option.value)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                    calendarSortConfig.mode === option.value
                      ? 'bg-surface-200 text-surface-900 dark:bg-surface-700 dark:text-surface-100'
                      : 'text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700'
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
