import { formatDistanceToNow } from 'date-fns';
import SortDesc from 'lucide-react/icons/arrow-down-wide-narrow';
import SortAsc from 'lucide-react/icons/arrow-up-narrow-wide';
import Check from 'lucide-react/icons/check';
import Plus from 'lucide-react/icons/plus';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Search from 'lucide-react/icons/search';
import SlidersHorizontal from 'lucide-react/icons/sliders-horizontal';
import { useEffect, useRef, useState } from 'react';
import { ComposedInput } from '$components/ComposedInput';
import { Tooltip } from '$components/Tooltip';
import { useModalState } from '$context/modalStateContext';
import { useCreateTask } from '$hooks/queries/useTasks';
import {
  useSetSearchQuery,
  useSetSelectedTask,
  useSetShowCompletedTasks,
  useSetShowUnstartedTasks,
  useSetSortConfig,
  useUIState,
} from '$hooks/queries/useUIState';
import type { SortDirection, SortMode } from '$types/index';
import {
  DEFAULT_SORT_CONFIG,
  JUST_NOW_SYNC_TEXT_MS_THRESHOLD,
  SORT_OPTIONS,
} from '$utils/constants';
import { getMetaKeyLabel, getModifierJoiner } from '$utils/keyboard';

interface HeaderProps {
  isSyncing?: boolean;
  isOffline?: boolean;
  lastSyncTime?: Date | null;
  onSync?: () => void;
  disableSync?: boolean;
}

export const Header = ({
  isSyncing = false,
  isOffline = false,
  lastSyncTime,
  onSync,
  disableSync = false,
}: HeaderProps) => {
  const { data: uiState } = useUIState();
  const setSearchQueryMutation = useSetSearchQuery();
  const setSortConfigMutation = useSetSortConfig();
  const setShowCompletedTasksMutation = useSetShowCompletedTasks();
  const setShowUnstartedTasksMutation = useSetShowUnstartedTasks();
  const createTaskMutation = useCreateTask();
  const setSelectedTaskMutation = useSetSelectedTask();

  const searchQuery = uiState?.searchQuery ?? '';
  const sortConfig = uiState?.sortConfig ?? DEFAULT_SORT_CONFIG;
  const showCompletedTasks = uiState?.showCompletedTasks ?? true;
  const showUnstartedTasks = uiState?.showUnstartedTasks ?? true;

  const { isAnyModalOpen } = useModalState();
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showJustNow, setShowJustNow] = useState(false);
  const justSyncedRef = useRef(false);
  const lastNonManualDirectionRef = useRef<SortDirection>(sortConfig.direction);
  const metaKey = getMetaKeyLabel();
  const modifierJoiner = getModifierJoiner();
  const searchShortcut = `${metaKey}${modifierJoiner}F`;
  const syncShortcut = `${metaKey}${modifierJoiner}R`;

  // Track when sync completes and show "just now" for 3 seconds
  useEffect(() => {
    if (!isSyncing && justSyncedRef.current) {
      // Sync just completed
      setShowJustNow(true);
      justSyncedRef.current = false;

      const timer = setTimeout(() => setShowJustNow(false), JUST_NOW_SYNC_TEXT_MS_THRESHOLD);

      return () => clearTimeout(timer);
    } else if (isSyncing) {
      // Mark that we're syncing
      justSyncedRef.current = true;
    }
  }, [isSyncing]);

  // handle ESC key to close view menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showViewMenu) {
        setShowViewMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showViewMenu]);

  const handleNewTask = () => {
    createTaskMutation.mutate(
      { title: '' },
      {
        onSuccess: (task) => {
          setSelectedTaskMutation.mutate(task.id);
        },
      },
    );
  };

  const toggleSortDirection = () => {
    const newDirection = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    // Save direction preference for non-manual modes
    if (sortConfig.mode !== 'manual') {
      lastNonManualDirectionRef.current = newDirection;
    }
    setSortConfigMutation.mutate({
      ...sortConfig,
      direction: newDirection,
    });
  };

  const handleSortChange = (mode: SortMode) => {
    let direction = sortConfig.direction;

    // save current direction if leaving a non-manual mode
    if (sortConfig.mode !== 'manual') {
      lastNonManualDirectionRef.current = sortConfig.direction;
    }

    // determine direction for new mode
    if (mode === 'manual') {
      // manual mode always uses 'asc' (though it's not actually used)
      direction = 'asc';
    } else if (sortConfig.mode === 'manual') {
      // switching from manual to another mode: restore saved direction
      direction = lastNonManualDirectionRef.current;
    }
    // otherwise keep current direction (switching between non-manual modes)

    setSortConfigMutation.mutate({
      ...sortConfig,
      mode,
      direction,
    });
  };

  return (
    <header className="h-[53px] bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 px-4 flex items-center">
      <div className="flex-1 flex items-center justify-between gap-4">
        <div className="flex-1 relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <ComposedInput
            type="text"
            data-search-input
            placeholder={`Search tasks... (${searchShortcut})`}
            value={searchQuery}
            onChange={(value) => setSearchQueryMutation.mutate(value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg text-sm text-surface-800 dark:text-surface-200 placeholder:text-surface-400 focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {onSync && (
            <Tooltip
              content={
                disableSync
                  ? 'Add an account to be able to use sync'
                  : isOffline
                    ? 'Cannot sync while offline'
                    : isSyncing
                      ? 'Sync in progress...'
                      : lastSyncTime && showJustNow
                        ? 'Last synced just now'
                        : lastSyncTime
                          ? `Last synced ${formatDistanceToNow(lastSyncTime, { addSuffix: true })}`
                          : `Sync with server (${syncShortcut})`
              }
              position="bottom"
            >
              <button
                type="button"
                onClick={onSync}
                disabled={isSyncing || isOffline || disableSync}
                className={`p-2 rounded-lg border text-sm transition-colors ${
                  isSyncing
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 border-primary-400 cursor-not-allowed'
                    : isOffline || disableSync
                      ? 'text-surface-300 dark:text-surface-600 border-transparent cursor-not-allowed'
                      : `text-surface-500 dark:text-surface-400 border-transparent ${!isAnyModalOpen ? 'hover:bg-surface-100 dark:hover:bg-surface-700' : ''}`
                }`}
              >
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </Tooltip>
          )}

          <div className="relative">
            <Tooltip content="View options" position="bottom">
              <button
                type="button"
                onClick={() => setShowViewMenu(!showViewMenu)}
                className={`flex items-center border border-transparent gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                  showViewMenu
                    ? 'bg-surface-200 dark:bg-surface-600 text-surface-700 dark:text-surface-200'
                    : `text-surface-600 dark:text-surface-400 ${!isAnyModalOpen ? 'hover:bg-surface-100 dark:hover:bg-surface-700' : ''}`
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>View</span>
              </button>
            </Tooltip>

            {showViewMenu && (
              <>
                {/* biome-ignore lint/a11y/noStaticElementInteractions: View menu backdrop for closing on outside click */}
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: View menu backdrop for closing on outside click */}
                <div className="fixed inset-0 z-40" onClick={() => setShowViewMenu(false)} />
                <div
                  data-context-menu-content
                  className="absolute right-0 top-full mt-1 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 z-50 min-w-[240px] animate-scale-in"
                >
                  {/* Filter Options */}
                  <div className="px-3 py-2 border-b border-surface-200 dark:border-surface-700">
                    <button
                      type="button"
                      onClick={() => setShowCompletedTasksMutation.mutate(!showCompletedTasks)}
                      className="w-full flex items-center justify-between gap-2.5 py-1.5 text-sm text-surface-700 dark:text-surface-300 hover:text-surface-900 dark:hover:text-surface-100 rounded"
                    >
                      <span>Show completed</span>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          showCompletedTasks
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-surface-300 dark:border-surface-600'
                        }`}
                      >
                        {showCompletedTasks && (
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUnstartedTasksMutation.mutate(!showUnstartedTasks)}
                      className="w-full flex items-center justify-between gap-2.5 py-1.5 text-sm text-surface-700 dark:text-surface-300 hover:text-surface-900 dark:hover:text-surface-100 rounded"
                    >
                      <span>Show unstarted</span>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          showUnstartedTasks
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-surface-300 dark:border-surface-600'
                        }`}
                      >
                        {showUnstartedTasks && (
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Sort By */}
                  <div className="py-2">
                    <div className="px-3 pb-2 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Sort By
                    </div>
                    {SORT_OPTIONS.map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => handleSortChange(option.value)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm transition-colors ${
                          sortConfig.mode === option.value
                            ? 'text-primary-600 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30'
                            : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
                        }`}
                      >
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Sort Direction */}
                  <div className="pt-2 border-t border-surface-200 dark:border-surface-700">
                    <div className="px-3 pb-2 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Sort Direction
                    </div>
                    <div className="relative group">
                      <button
                        type="button"
                        onClick={sortConfig.mode === 'manual' ? () => {} : toggleSortDirection}
                        disabled={sortConfig.mode === 'manual'}
                        className={`w-full flex rounded-b-md items-center justify-between gap-2 px-3 py-1.5 text-sm ${
                          sortConfig.mode === 'manual'
                            ? 'text-surface-400 dark:text-surface-600 cursor-not-allowed'
                            : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {sortConfig.direction === 'asc' ? (
                            <SortAsc className="w-4 h-4" />
                          ) : (
                            <SortDesc className="w-4 h-4" />
                          )}
                          <span>{sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}</span>
                        </div>
                      </button>
                      {sortConfig.mode === 'manual' && (
                        <div className="invisible group-hover:visible absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-white bg-surface-900 dark:bg-surface-700 rounded shadow-lg whitespace-nowrap pointer-events-none z-50">
                          Not available for manual sorting
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleNewTask}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border text-sm transition-colors border-primary-400 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ${!isAnyModalOpen ? 'hover:bg-primary-100 dark:hover:bg-primary-800' : ''} shadow-sm`}
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>
    </header>
  );
};
