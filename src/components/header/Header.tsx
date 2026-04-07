import { formatDistanceToNow } from 'date-fns';

import Plus from 'lucide-react/icons/plus';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Search from 'lucide-react/icons/search';
import SlidersHorizontal from 'lucide-react/icons/sliders-horizontal';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ComposedInput } from '$components/ComposedInput';
import { HeaderSortDirectionButton } from '$components/header/HeaderSortDirectionButton';
import { HeaderSortOptionButton } from '$components/header/HeaderSortOptionsButton';
import { HeaderViewMenuCheckbox } from '$components/header/HeaderViewMenuCheckbox';
import { Tooltip } from '$components/Tooltip';
import { DEFAULT_SORT_CONFIG, JUST_NOW_SYNC_TEXT_MS_THRESHOLD, SORT_OPTIONS } from '$constants';
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
import { useEscapeKey } from '$hooks/ui/useEscapeKey';
import type { SortDirection, SortMode } from '$types';
import { getMetaKeyLabel, getModifierJoiner } from '$utils/keyboard';

// Extracted helper: get sync button tooltip content
const getSyncTooltip = (
  disableSync: boolean,
  isOffline: boolean,
  isSyncing: boolean,
  lastSyncTime: Date | null | undefined,
  showJustNow: boolean,
  syncShortcut: string,
): string => {
  if (disableSync) return 'Add an account to be able to use sync';
  if (isOffline) return 'Cannot sync while offline';
  if (isSyncing) return 'Sync in progress...';
  if (lastSyncTime && showJustNow) return 'Last synced just now';
  if (lastSyncTime) return `Last synced ${formatDistanceToNow(lastSyncTime, { addSuffix: true })}`;
  return `Sync with server (${syncShortcut})`;
};

// Extracted helper: get sync button class
const getSyncButtonClass = (
  isSyncing: boolean,
  isOffline: boolean,
  disableSync: boolean,
  isAnyModalOpen: boolean,
): string => {
  const base =
    'w-9 h-9 rounded-lg border text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset flex items-center justify-center';
  if (isSyncing) {
    return `${base} text-primary-500 bg-surface-100 dark:bg-surface-800 border-surface-200 dark:border-surface-600 cursor-not-allowed`;
  }
  if (isOffline || disableSync) {
    return `${base} text-surface-300 dark:text-surface-600 border-transparent cursor-not-allowed`;
  }
  return `${base} text-surface-500 dark:text-surface-400 border-transparent ${!isAnyModalOpen ? 'hover:bg-surface-100 dark:hover:bg-surface-700' : ''}`;
};

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

  const closeViewMenu = useCallback(() => setShowViewMenu(false), []);
  useEscapeKey(closeViewMenu, { enabled: showViewMenu });

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
    <header className="h-13.25 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 px-4 flex items-center">
      <div className="flex-1 flex items-center justify-between gap-4">
        <div className="flex-1 relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <ComposedInput
            type="text"
            data-search-input
            placeholder={`Search tasks... (${searchShortcut})`}
            value={searchQuery}
            onChange={(value) => setSearchQueryMutation.mutate(value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-100 dark:bg-surface-700/60 border border-transparent rounded-lg text-sm text-surface-800 dark:text-surface-200 placeholder:text-surface-400 focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onSync && (
            <Tooltip
              content={getSyncTooltip(
                disableSync,
                isOffline,
                isSyncing,
                lastSyncTime,
                showJustNow,
                syncShortcut,
              )}
              position="bottom"
            >
              <button
                type="button"
                onClick={onSync}
                disabled={isSyncing || isOffline || disableSync}
                className={getSyncButtonClass(isSyncing, isOffline, disableSync, isAnyModalOpen)}
              >
                <RefreshCw className={`w-5 h-5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </Tooltip>
          )}

          <div className="relative">
            <Tooltip content="View options" position="bottom">
              <button
                type="button"
                onClick={() => setShowViewMenu(!showViewMenu)}
                className={`flex items-center border border-transparent gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
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
                  className="absolute right-0 top-full mt-1 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 z-50 min-w-60 animate-scale-in"
                >
                  <div className="px-3 py-2 border-b border-surface-200 dark:border-surface-700">
                    <HeaderViewMenuCheckbox
                      label="Show completed"
                      checked={showCompletedTasks}
                      onClick={() => setShowCompletedTasksMutation.mutate(!showCompletedTasks)}
                    />
                    <HeaderViewMenuCheckbox
                      label="Show unstarted"
                      checked={showUnstartedTasks}
                      onClick={() => setShowUnstartedTasksMutation.mutate(!showUnstartedTasks)}
                    />
                  </div>

                  <div className="py-2">
                    <div className="px-3 pb-2 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Sort By
                    </div>
                    {SORT_OPTIONS.map((option) => (
                      <HeaderSortOptionButton
                        key={option.value}
                        option={option}
                        isActive={sortConfig.mode === option.value}
                        onClick={() => handleSortChange(option.value)}
                      />
                    ))}
                  </div>

                  <div className="pt-2 border-t border-surface-200 dark:border-surface-700">
                    <div className="px-3 pb-2 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Sort Direction
                    </div>
                    <HeaderSortDirectionButton
                      sortConfig={sortConfig}
                      onToggle={toggleSortDirection}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleNewTask}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border border-transparent text-sm transition-colors bg-primary-500 text-primary-contrast ${!isAnyModalOpen ? 'hover:bg-primary-600' : ''} shadow-xs outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>
    </header>
  );
};
