import { formatDistanceToNow } from 'date-fns';

import RefreshCw from 'lucide-react/icons/refresh-cw';
import Search from 'lucide-react/icons/search';
import X from 'lucide-react/icons/x';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ComposedInput } from '$components/ComposedInput';
import { getHeaderContextTitle, HeaderContextTitle } from '$components/header/HeaderContextTitle';
import { HeaderViewMenu } from '$components/header/HeaderViewMenu';
import { TaskBatchActionsBar } from '$components/header/TaskBatchActionsBar/TaskBatchActionsBar';
import { Tooltip } from '$components/Tooltip';
import {
  DEFAULT_SORT_CONFIG,
  DEFAULT_TASK_GROUP_CONFIG,
  JUST_NOW_SYNC_TEXT_MS_THRESHOLD,
} from '$constants';
import { useModalState } from '$context/modalStateContext';
import { useTaskSelection } from '$context/taskSelectionContext';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useFilters } from '$hooks/queries/useFilters';
import { useTags } from '$hooks/queries/useTags';
import {
  useSetMoveCompletedTasksToBottom,
  useSetSearchQuery,
  useSetShowCompletedTasks,
  useSetShowUnstartedTasks,
  useSetSortConfig,
  useSetTaskGroupConfig,
  useUIState,
} from '$hooks/queries/useUIState';
import { useVisibleTasks } from '$hooks/queries/useVisibleTasks';
import type { SortDirection, SortMode, TaskGroupMode } from '$types/sort';
import { getMetaKeyLabel, getModifierJoiner } from '$utils/keyboard';
import { pluralize } from '$utils/misc';

const SYNC_SOURCE_LABELS: Record<string, string> = {
  'header-sync-button': 'manually',
  'tray-sync': 'manually',
  'keyboard-shortcut': 'manually',
  'app-menu': 'manually',
  'settings-sync-button': 'manually',
  'auto-interval': 'automatically',
  'startup-initial': 'on startup',
  'auto-reconnect': 'on reconnect',
  'webdav-push': 'from WebDAV Push',
};

// extracted helper: get sync button tooltip content
const getSyncTooltip = (
  disableSync: boolean,
  isConnectionTesting: boolean,
  isOffline: boolean,
  isSyncing: boolean,
  lastSyncTime: Date | null | undefined,
  showJustNow: boolean,
  syncShortcut: string,
  syncingCalendarName: string | null,
  syncProgress: { current: number; total: number } | null,
  lastSyncSource: string | null,
  accountCount: number,
) => {
  if (isConnectionTesting) return 'Connection test in progress...';
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

// extracted helper: get sync button class
const getSyncButtonClass = (
  isSyncing: boolean,
  isOffline: boolean,
  disableSync: boolean,
  isAnyModalOpen: boolean,
) => {
  const base =
    'flex h-9 w-9 items-center justify-center rounded-lg border border-transparent outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset';
  if (isSyncing) {
    return `${base} text-primary-ink border-transparent cursor-not-allowed`;
  }
  if (isOffline || disableSync) {
    return `${base} text-surface-500 dark:text-surface-600 border-transparent cursor-not-allowed`;
  }
  return `${base} text-surface-500 dark:text-surface-400 border-transparent ${!isAnyModalOpen ? 'hover:bg-surface-100 dark:hover:bg-surface-700' : ''}`;
};

interface HeaderProps {
  className?: string;
  isSyncing?: boolean;
  syncingCalendarId?: string | null;
  syncProgress?: { current: number; total: number } | null;
  isOffline?: boolean;
  lastSyncTime?: Date | null;
  lastSyncSource?: string | null;
  onSync?: () => void;
  disableSync?: boolean;
  isConnectionTesting?: boolean;
}

export const Header = ({
  className = '',
  isSyncing = false,
  syncingCalendarId = null,
  syncProgress = null,
  isOffline = false,
  lastSyncTime,
  lastSyncSource = null,
  onSync,
  disableSync = false,
  isConnectionTesting = false,
}: HeaderProps) => {
  const { data: uiState } = useUIState();
  const { data: accounts = [] } = useAccounts();
  const { data: filters = [] } = useFilters();
  const { data: tags = [] } = useTags();
  const setSearchQueryMutation = useSetSearchQuery();
  const setSortConfigMutation = useSetSortConfig();
  const setTaskGroupConfigMutation = useSetTaskGroupConfig();
  const setShowCompletedTasksMutation = useSetShowCompletedTasks();
  const setMoveCompletedTasksToBottomMutation = useSetMoveCompletedTasksToBottom();
  const setShowUnstartedTasksMutation = useSetShowUnstartedTasks();
  const visibleTasks = useVisibleTasks();
  const { selectedTaskIdSet, clearSelection } = useTaskSelection();

  const searchQuery = uiState?.searchQuery ?? '';
  const sortConfig = uiState?.sortConfig ?? DEFAULT_SORT_CONFIG;
  const taskGroupConfig = uiState?.taskGroupConfig ?? DEFAULT_TASK_GROUP_CONFIG;
  const activeCalendarId = uiState?.activeCalendarId ?? null;
  const activeTagId = uiState?.activeTagId ?? null;
  const activeFilterId = uiState?.activeFilterId ?? null;
  const showCompletedTasks = uiState?.showCompletedTasks ?? true;
  const moveCompletedTasksToBottom = uiState?.moveCompletedTasksToBottom ?? false;
  const showUnstartedTasks = uiState?.showUnstartedTasks ?? true;
  const activeView = uiState?.activeView ?? 'tasks';

  const { isAnyModalOpen } = useModalState();
  const [showJustNow, setShowJustNow] = useState(false);
  const justSyncedRef = useRef(false);
  const lastNonManualDirectionRef = useRef<SortDirection>(sortConfig.direction);
  const metaKey = getMetaKeyLabel();
  const modifierJoiner = getModifierJoiner();
  const searchShortcut = `${metaKey}${modifierJoiner}F`;
  const syncShortcut = `${metaKey}${modifierJoiner}R`;

  const selectedTasks = useMemo(
    () => visibleTasks.filter((task) => selectedTaskIdSet.has(task.id)),
    [selectedTaskIdSet, visibleTasks],
  );
  const [isSearchOpen, setIsSearchOpen] = useState(() => Boolean(searchQuery));
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchToggleRef = useRef<HTMLButtonElement>(null);

  const calendars = accounts.flatMap((account) => account.calendars);
  const searchContextTitle = getHeaderContextTitle({
    activeView,
    activeCalendarId,
    activeTagId,
    activeFilterId,
    calendars,
    tags,
    filters,
  });
  const syncingCalendarName = syncingCalendarId
    ? (calendars.find((calendar) => calendar.id === syncingCalendarId)?.displayName ?? null)
    : null;

  // track when sync completes and show "just now" for 3 seconds
  useEffect(() => {
    if (!isSyncing && justSyncedRef.current) {
      // sync just completed
      setShowJustNow(true);
      justSyncedRef.current = false;

      const timer = setTimeout(() => setShowJustNow(false), JUST_NOW_SYNC_TEXT_MS_THRESHOLD);

      return () => clearTimeout(timer);
    } else if (isSyncing) {
      // mark that we're syncing
      justSyncedRef.current = true;
    }
  }, [isSyncing]);

  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus();
  }, [isSearchOpen]);

  const closeSearch = () => {
    setSearchQueryMutation.mutate('');
    setIsSearchOpen(false);
    requestAnimationFrame(() => {
      searchToggleRef.current?.focus();
    });
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement | HTMLButtonElement>) => {
    if (isAnyModalOpen || event.key !== 'Escape') return;
    event.preventDefault();
    closeSearch();
  };

  const headerIconButtonClass = `flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-surface-600 outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:text-surface-400 ${!isAnyModalOpen ? 'hover:bg-surface-100 dark:hover:bg-surface-700' : ''}`;

  const toggleSortDirection = () => {
    const newDirection = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    // save direction preference for non-manual modes
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

  const handleTaskGroupChange = (mode: TaskGroupMode) => {
    setTaskGroupConfigMutation.mutate({ ...taskGroupConfig, mode });
  };

  const toggleTaskGroupDirection = () => {
    setTaskGroupConfigMutation.mutate({
      ...taskGroupConfig,
      direction: taskGroupConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  if (selectedTasks.length > 0) {
    return (
      <header
        className={`app-main-header flex h-13 items-center bg-surface-50 pr-4.25 pl-4 dark:bg-surface-900 ${className}`}
      >
        <TaskBatchActionsBar
          data-drag-region-pass-through
          selectedTasks={selectedTasks}
          onClearSelection={clearSelection}
          mode={activeView === 'recently-deleted' ? 'deleted' : 'active'}
        />
      </header>
    );
  }

  return (
    <header
      className={`app-main-header flex h-13 items-center bg-surface-50 pr-4.25 pl-4 dark:bg-surface-900 ${className}`}
    >
      <div
        data-drag-region-pass-through
        className="@container flex min-w-0 flex-1 items-center justify-between gap-2"
      >
        {isSearchOpen ? (
          <div data-drag-region-pass-through className="flex min-w-0 flex-1 items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-surface-500 dark:text-surface-400" />
              <ComposedInput
                ref={searchInputRef}
                type="text"
                data-search-input
                placeholder={`Search tasks in ${searchContextTitle}...`}
                value={searchQuery}
                onChange={(value) => setSearchQueryMutation.mutate(value)}
                onKeyDown={handleSearchKeyDown}
                className="h-9 w-full rounded-lg border border-surface-300 bg-white py-0 pr-10 pl-9 text-sm text-surface-800 outline-hidden transition-colors placeholder:text-surface-400 hover:border-surface-400 focus:border-primary-ink focus:bg-white focus:hover:border-primary-ink dark:border-surface-700 dark:bg-surface-800/80 dark:text-surface-200 dark:focus:bg-surface-800 dark:hover:border-surface-600 dark:focus:hover:border-primary-ink"
              />
              <button
                type="button"
                data-search-close
                aria-label="Close search"
                title="Close search"
                onClick={closeSearch}
                onKeyDown={handleSearchKeyDown}
                className={`absolute top-1/2 right-1 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-surface-500 outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:text-surface-400 ${!isAnyModalOpen ? 'hover:bg-surface-100 dark:hover:bg-surface-700' : ''}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <HeaderContextTitle
              activeView={activeView}
              activeCalendarId={activeCalendarId}
              activeTagId={activeTagId}
              activeFilterId={activeFilterId}
              calendars={calendars}
              tags={tags}
              filters={filters}
            />

            <div data-drag-region-pass-through className="flex shrink-0 items-center gap-2">
              {onSync && (
                <Tooltip
                  content={getSyncTooltip(
                    disableSync,
                    isConnectionTesting,
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
                    aria-label="Sync"
                    disabled={isSyncing || isOffline || disableSync || isConnectionTesting}
                    className={getSyncButtonClass(
                      isSyncing,
                      isOffline,
                      disableSync || isConnectionTesting,
                      isAnyModalOpen,
                    )}
                  >
                    <RefreshCw
                      className={`h-4 w-4 shrink-0 ${isSyncing ? 'motion-safe:animate-spin' : ''}`}
                    />
                  </button>
                </Tooltip>
              )}

              <HeaderViewMenu
                isAnyModalOpen={isAnyModalOpen}
                sortConfig={sortConfig}
                taskGroupConfig={taskGroupConfig}
                activeCalendarId={activeCalendarId}
                showCompletedTasks={showCompletedTasks}
                showUnstartedTasks={showUnstartedTasks}
                moveCompletedTasksToBottom={moveCompletedTasksToBottom}
                onShowCompletedTasksChange={() =>
                  setShowCompletedTasksMutation.mutate(!showCompletedTasks)
                }
                onShowUnstartedTasksChange={() =>
                  setShowUnstartedTasksMutation.mutate(!showUnstartedTasks)
                }
                onMoveCompletedTasksToBottomChange={() =>
                  setMoveCompletedTasksToBottomMutation.mutate(!moveCompletedTasksToBottom)
                }
                onSortDirectionToggle={toggleSortDirection}
                onSortChange={handleSortChange}
                onTaskGroupDirectionToggle={toggleTaskGroupDirection}
                onTaskGroupChange={handleTaskGroupChange}
              />

              <Tooltip content={`Search tasks (${searchShortcut})`} position="bottom">
                <button
                  ref={searchToggleRef}
                  type="button"
                  data-search-toggle
                  aria-label="Search tasks"
                  onClick={() => setIsSearchOpen(true)}
                  className={headerIconButtonClass}
                >
                  <Search className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
