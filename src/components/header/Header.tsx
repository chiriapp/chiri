import { formatDistanceToNow } from 'date-fns';

import ChevronRight from 'lucide-react/icons/chevron-right';
import Plus from 'lucide-react/icons/plus';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Search from 'lucide-react/icons/search';
import SlidersHorizontal from 'lucide-react/icons/sliders-horizontal';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ComposedInput } from '$components/ComposedInput';
import { FloatingDropdownFrame } from '$components/FloatingDropdownFrame';
import { HoverFlyout, HoverFlyoutGroup } from '$components/HoverFlyout';
import { SortDirectionButton } from '$components/header/SortDirectionButton';
import { SortOptionButton } from '$components/header/SortOptionsButton';
import { ViewMenuCheckbox } from '$components/header/ViewMenuCheckbox';
import { TaskBatchActionsBar } from '$components/TaskBatchActionsBar';
import { Tooltip } from '$components/Tooltip';
import { DEFAULT_SORT_CONFIG, JUST_NOW_SYNC_TEXT_MS_THRESHOLD, SORT_OPTIONS } from '$constants';
import { useModalState } from '$context/modalStateContext';
import { useTaskSelection } from '$context/taskSelectionContext';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useCreateTask } from '$hooks/queries/useTasks';
import {
  useSetSearchQuery,
  useSetSelectedTask,
  useSetShowCompletedTasks,
  useSetShowUnstartedTasks,
  useSetSortConfig,
  useUIState,
} from '$hooks/queries/useUIState';
import { useVisibleTasks } from '$hooks/queries/useVisibleTasks';
import type { SortDirection, SortMode } from '$types/sort';
import { getMetaKeyLabel, getModifierJoiner } from '$utils/keyboard';
import { pluralize } from '$utils/misc';

const SYNC_SOURCE_LABELS: Record<string, string> = {
  'header-sync-button': 'manually',
  'tray-sync': 'manually',
  'keyboard-shortcut': 'manually',
  'app-menu': 'manually',
  'auto-interval': 'automatically',
  'startup-initial': 'on startup',
  'auto-reconnect': 'on reconnect',
};

// Extracted helper: get sync button tooltip content
const getSyncTooltip = (
  disableSync: boolean,
  isOffline: boolean,
  isSyncing: boolean,
  lastSyncTime: Date | null | undefined,
  showJustNow: boolean,
  syncShortcut: string,
  syncingCalendarName: string | null,
  syncProgress: { current: number; total: number } | null,
  lastSyncSource: string | null,
  accountCount: number,
): string => {
  if (disableSync) return 'Add an account to be able to use sync';
  if (isOffline) return 'Cannot sync while offline';
  if (isSyncing) {
    const progress =
      syncingCalendarName && syncProgress ? ` (${syncProgress.current}/${syncProgress.total})` : '';
    return syncingCalendarName
      ? `Syncing ${syncingCalendarName}...${progress}`
      : 'Sync in progress...';
  }
  if (lastSyncTime) {
    const when = formatDistanceToNow(lastSyncTime, { addSuffix: true });
    const sourceLabel = lastSyncSource ? SYNC_SOURCE_LABELS[lastSyncSource] : null;
    const time = showJustNow ? 'just now' : when;
    return sourceLabel ? `Last synced ${sourceLabel} ${time}` : `Last synced ${time}`;
  }
  return `Sync with ${pluralize(accountCount, 'server')} (${syncShortcut})`;
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
  syncingCalendarId?: string | null;
  syncProgress?: { current: number; total: number } | null;
  isOffline?: boolean;
  lastSyncTime?: Date | null;
  lastSyncSource?: string | null;
  onSync?: () => void;
  disableSync?: boolean;
}

export const Header = ({
  isSyncing = false,
  syncingCalendarId = null,
  syncProgress = null,
  isOffline = false,
  lastSyncTime,
  lastSyncSource = null,
  onSync,
  disableSync = false,
}: HeaderProps) => {
  const { data: uiState } = useUIState();
  const { data: accounts = [] } = useAccounts();
  const setSearchQueryMutation = useSetSearchQuery();
  const setSortConfigMutation = useSetSortConfig();
  const setShowCompletedTasksMutation = useSetShowCompletedTasks();
  const setShowUnstartedTasksMutation = useSetShowUnstartedTasks();
  const createTaskMutation = useCreateTask();
  const setSelectedTaskMutation = useSetSelectedTask();
  const visibleTasks = useVisibleTasks();
  const { selectedTaskIdSet, clearSelection } = useTaskSelection();

  const searchQuery = uiState?.searchQuery ?? '';
  const sortConfig = uiState?.sortConfig ?? DEFAULT_SORT_CONFIG;
  const showCompletedTasks = uiState?.showCompletedTasks ?? true;
  const showUnstartedTasks = uiState?.showUnstartedTasks ?? true;
  const activeView = uiState?.activeView ?? 'tasks';

  const { isAnyModalOpen } = useModalState();
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showJustNow, setShowJustNow] = useState(false);
  const justSyncedRef = useRef(false);
  const viewMenuButtonRef = useRef<HTMLButtonElement>(null);
  const lastNonManualDirectionRef = useRef<SortDirection>(sortConfig.direction);
  const metaKey = getMetaKeyLabel();
  const modifierJoiner = getModifierJoiner();
  const searchShortcut = `${metaKey}${modifierJoiner}F`;
  const syncShortcut = `${metaKey}${modifierJoiner}R`;

  const syncingCalendarName = syncingCalendarId
    ? (accounts.flatMap((a) => a.calendars).find((c) => c.id === syncingCalendarId)?.displayName ??
      null)
    : null;

  const selectedTasks = useMemo(
    () => visibleTasks.filter((task) => selectedTaskIdSet.has(task.id)),
    [selectedTaskIdSet, visibleTasks],
  );

  useEffect(() => {
    if (selectedTasks.length > 0) {
      setShowViewMenu(false);
    }
  }, [selectedTasks.length]);

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

  const handleNewTask = () => {
    createTaskMutation.mutate(
      { title: '' },
      {
        onSuccess: (task) => {
          setSelectedTaskMutation.mutate({ id: task.id, focusTitle: true });
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

  if (selectedTasks.length > 0) {
    return (
      <header className="h-13.25 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 px-4 flex items-center">
        <TaskBatchActionsBar
          selectedTasks={selectedTasks}
          onClearSelection={clearSelection}
          mode={activeView === 'recently-deleted' ? 'deleted' : 'active'}
        />
      </header>
    );
  }

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
                syncingCalendarName,
                syncProgress,
                lastSyncSource,
                accounts.filter((a) => a.caldav).length,
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
                ref={viewMenuButtonRef}
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
              <FloatingDropdownFrame
                anchorRef={viewMenuButtonRef}
                onClose={() => setShowViewMenu(false)}
                dropdownClassName="z-50 min-w-60"
                dataAttribute="data-context-menu-content"
              >
                <div className="px-3 py-2 border-b border-surface-200 dark:border-surface-700">
                  <ViewMenuCheckbox
                    label="Show completed"
                    checked={showCompletedTasks}
                    onClick={() => setShowCompletedTasksMutation.mutate(!showCompletedTasks)}
                  />
                  <ViewMenuCheckbox
                    label="Show unstarted"
                    checked={showUnstartedTasks}
                    onClick={() => setShowUnstartedTasksMutation.mutate(!showUnstartedTasks)}
                  />
                </div>

                <div className="py-2 space-y-1">
                  <div className="px-3 pb-1 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                    Tasks
                  </div>

                  <HoverFlyoutGroup>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-sm text-surface-700 dark:text-surface-300 transition-colors outline-hidden hover:bg-surface-100 dark:hover:bg-surface-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                    >
                      <span>Sort Direction</span>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-xs text-surface-500 dark:text-surface-400">
                          {sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-surface-400" />
                      </div>
                    </button>

                    <HoverFlyout side="left" minWidthClassName="min-w-52">
                      <div className="px-3 pb-2 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                        Sort Direction
                      </div>
                      <SortDirectionButton sortConfig={sortConfig} onToggle={toggleSortDirection} />
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
                          {SORT_OPTIONS.find((option) => option.value === sortConfig.mode)?.label}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-surface-400" />
                      </div>
                    </button>

                    <HoverFlyout side="left" minWidthClassName="min-w-52">
                      <div className="px-3 pb-2 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                        Sort By
                      </div>
                      <div className="space-y-1">
                        {SORT_OPTIONS.map((option) => (
                          <SortOptionButton
                            key={option.value}
                            option={option}
                            isActive={sortConfig.mode === option.value}
                            onClick={() => handleSortChange(option.value)}
                          />
                        ))}
                      </div>
                    </HoverFlyout>
                  </HoverFlyoutGroup>
                </div>
              </FloatingDropdownFrame>
            )}
          </div>

          <button
            type="button"
            onClick={handleNewTask}
            className={`flex items-center gap-2 px-4 py-1.5 font-medium rounded-lg border border-transparent text-sm transition-colors bg-primary-500 text-primary-contrast ${!isAnyModalOpen ? 'hover:bg-primary-600' : ''} shadow-xs outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>
    </header>
  );
};
