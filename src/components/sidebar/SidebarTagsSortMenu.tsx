import ChevronRight from 'lucide-react/icons/chevron-right';
import type { RefObject } from 'react';
import { FloatingDropdownFrame } from '$components/FloatingDropdownFrame';
import { HoverFlyout, HoverFlyoutGroup } from '$components/HoverFlyout';
import { SidebarSortDirectionButton } from '$components/sidebar/SidebarSortDirectionButton';
import { TAG_SORT_OPTIONS } from '$constants';
import { useSetTagSortConfig } from '$hooks/queries/useUIState';
import type { TagSortConfig } from '$types/sort';

interface SidebarTagsSortMenuProps {
  anchorRef: RefObject<HTMLElement | null>;
  tagSortConfig: TagSortConfig;
  onClose: () => void;
}

export const SidebarTagsSortMenu = ({
  anchorRef,
  tagSortConfig,
  onClose,
}: SidebarTagsSortMenuProps) => {
  const setTagSortConfigMutation = useSetTagSortConfig();

  const handleSortModeChange = (mode: TagSortConfig['mode']) => {
    setTagSortConfigMutation.mutate({ ...tagSortConfig, mode });
  };

  const toggleSortDirection = () => {
    setTagSortConfigMutation.mutate({
      ...tagSortConfig,
      direction: tagSortConfig.direction === 'asc' ? 'desc' : 'asc',
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
          Tags
        </div>

        <HoverFlyoutGroup>
          <button
            type="button"
            className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-sm text-surface-700 dark:text-surface-300 transition-colors outline-hidden hover:bg-surface-100 dark:hover:bg-surface-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <span>Sort Direction</span>
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-xs text-surface-500 dark:text-surface-400">
                {tagSortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-surface-400" />
            </div>
          </button>

          <HoverFlyout side="right">
            <div className="px-3 pb-2 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              Sort Direction
            </div>
            <SidebarSortDirectionButton
              direction={tagSortConfig.direction}
              disabled={tagSortConfig.mode === 'manual'}
              onToggle={toggleSortDirection}
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
                {TAG_SORT_OPTIONS.find((option) => option.value === tagSortConfig.mode)?.label}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-surface-400" />
            </div>
          </button>

          <HoverFlyout side="right">
            <div className="px-3 pb-2 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              Sort By
            </div>
            <div className="space-y-1">
              {TAG_SORT_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => handleSortModeChange(option.value)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                    tagSortConfig.mode === option.value
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
