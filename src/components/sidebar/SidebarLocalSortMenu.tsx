import type { RefObject } from 'react';
import { FloatingDropdownFrame } from '$components/FloatingDropdownFrame';
import { SidebarSortDirectionButton } from '$components/sidebar/SidebarSortDirectionButton';
import { CALENDAR_SORT_OPTIONS } from '$constants';
import { useSetCalendarSortConfig } from '$hooks/queries/useUIState';
import type { CalendarSortConfig } from '$types';

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
      dataAttribute="data-context-menu-content"
    >
      <div className="py-2">
        <div className="px-3 pb-1 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
          Calendars
        </div>
        {CALENDAR_SORT_OPTIONS.map((option) => (
          <button
            type="button"
            key={option.value}
            onClick={() => handleSortModeChange(option.value)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
              calendarSortConfig.mode === option.value
                ? 'bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100'
                : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
            }`}
          >
            <span>{option.label}</span>
          </button>
        ))}
        <SidebarSortDirectionButton
          direction={calendarSortConfig.direction}
          disabled={calendarSortConfig.mode === 'manual'}
          onToggle={toggleSortDirection}
        />
      </div>
    </FloatingDropdownFrame>
  );
};
