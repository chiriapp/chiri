import { SidebarSortDirectionButton } from '$components/sidebar/SidebarSortDirectionButton';
import { TAG_SORT_OPTIONS } from '$constants';
import { useSetTagSortConfig } from '$hooks/queries/useUIState';
import type { TagSortConfig } from '$types';

interface SidebarTagsSortMenuProps {
  tagSortConfig: TagSortConfig;
  onClose: () => void;
}

export const SidebarTagsSortMenu = ({ tagSortConfig, onClose }: SidebarTagsSortMenuProps) => {
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
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Sort menu backdrop for closing on outside click */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Sort menu backdrop for closing on outside click */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        data-context-menu-content
        className="absolute right-0 top-full mt-1 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 z-50 min-w-50 animate-scale-in"
      >
        <div className="py-2">
          <div className="px-3 pb-2 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
            Sort By
          </div>
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

        <div className="pt-2 border-t border-surface-200 dark:border-surface-700">
          <div className="px-3 pb-2 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
            Sort Direction
          </div>
          <SidebarSortDirectionButton
            direction={tagSortConfig.direction}
            disabled={tagSortConfig.mode === 'manual'}
            onToggle={toggleSortDirection}
          />
        </div>
      </div>
    </>
  );
};
