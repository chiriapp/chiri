import ChevronRight from 'lucide-react/icons/chevron-right';
import type { RefObject } from 'react';
import { FloatingDropdownFrame } from '$components/FloatingDropdownFrame';
import { HoverFlyout, HoverFlyoutGroup } from '$components/HoverFlyout';
import { SidebarSortDirectionButton } from '$components/sidebar/SidebarSortDirectionButton';
import { FILTER_SORT_OPTIONS } from '$constants';
import { useSetFilterSortConfig } from '$hooks/queries/useUIState';
import type { FilterSortConfig } from '$types/sort';

interface SidebarFiltersSortMenuProps {
  anchorRef: RefObject<HTMLElement | null>;
  filterSortConfig: FilterSortConfig;
  onClose: () => void;
}

export const SidebarFiltersSortMenu = ({
  anchorRef,
  filterSortConfig,
  onClose,
}: SidebarFiltersSortMenuProps) => {
  const setFilterSortConfigMutation = useSetFilterSortConfig();

  const handleSortModeChange = (mode: FilterSortConfig['mode']) => {
    setFilterSortConfigMutation.mutate({ ...filterSortConfig, mode });
  };

  const toggleSortDirection = () => {
    setFilterSortConfigMutation.mutate({
      ...filterSortConfig,
      direction: filterSortConfig.direction === 'asc' ? 'desc' : 'asc',
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
      <div className="space-y-1 px-3 py-2">
        <div className="pt-1 pb-1 font-medium text-sm text-surface-500 dark:text-surface-400">
          Filters
        </div>

        <HoverFlyoutGroup>
          <button
            type="button"
            className="-mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:text-surface-300 dark:hover:bg-surface-700"
          >
            <span>Sort By</span>
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-surface-500 text-xs dark:text-surface-400">
                {
                  FILTER_SORT_OPTIONS.find((option) => option.value === filterSortConfig.mode)
                    ?.label
                }
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-surface-400" />
            </div>
          </button>

          <HoverFlyout side="right" gap={8}>
            <div className="flex items-center justify-between px-3 pb-1 font-medium text-sm text-surface-500 dark:text-surface-400">
              <span>Sort By</span>
              <SidebarSortDirectionButton
                direction={filterSortConfig.direction}
                disabled={filterSortConfig.mode === 'manual'}
                onToggle={toggleSortDirection}
              />
            </div>
            <div className="space-y-1 px-1">
              {FILTER_SORT_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => handleSortModeChange(option.value)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset ${
                    filterSortConfig.mode === option.value
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
