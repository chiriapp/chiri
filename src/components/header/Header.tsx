import { formatDistanceToNow } from 'date-fns';

import Plus from 'lucide-react/icons/plus';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Search from 'lucide-react/icons/search';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ComposedInput } from '$components/ComposedInput';
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
import { useCreateTask } from '$hooks/queries/useTasks';
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
    'flex h-9 items-center gap-1.5 rounded-lg border border-transparent px-3 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset';
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
  const setSearchQueryMutation = useSetSearchQuery();
  const setSortConfigMutation = useSetSortConfig();
  const setTaskGroupConfigMutation = useSetTaskGroupConfig();
  const setShowCompletedTasksMutation = useSetShowCompletedTasks();
  const setMoveCompletedTasksToBottomMutation = useSetMoveCompletedTasksToBottom();
  const setShowUnstartedTasksMutation = useSetShowUnstartedTasks();
  const createTaskMutation = useCreateTask('created', { selectCreatedTask: true });
  const visibleTasks = useVisibleTasks();
  const { selectedTaskIdSet, clearSelection } = useTaskSelection();

  const searchQuery = uiState?.searchQuery ?? '';
  const sortConfig = uiState?.sortConfig ?? DEFAULT_SORT_CONFIG;
  const taskGroupConfig = uiState?.taskGroupConfig ?? DEFAULT_TASK_GROUP_CONFIG;
  const activeCalendarId = uiState?.activeCalendarId ?? null;
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

  const syncingCalendarName = syncingCalendarId
    ? (accounts.flatMap((a) => a.calendars).find((c) => c.id === syncingCalendarId)?.displayName ??
      null)
    : null;

  const selectedTasks = useMemo(
    () => visibleTasks.filter((task) => selectedTaskIdSet.has(task.id)),
    [selectedTaskIdSet, visibleTasks],
  );

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

  const handleNewTask = () => {
    createTaskMutation.mutate({ title: '' });
  };

  const newTaskButton = (
    <button
      type="button"
      onClick={handleNewTask}
      disabled={activeView === 'recently-deleted'}
      className={`flex h-9 items-center gap-2 rounded-lg border border-transparent bg-primary-500 px-4 font-medium text-primary-contrast text-sm transition-colors ${!isAnyModalOpen ? 'hover:bg-primary-600' : ''} shadow-xs outline-hidden focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <Plus className="h-4 w-4" />
      New Task
    </button>
  );

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
      <div data-drag-region-pass-through className="flex flex-1 items-center justify-between gap-4">
        <div data-drag-region-pass-through className="relative max-w-lg flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-surface-500 dark:text-surface-400" />
          <ComposedInput
            type="text"
            data-search-input
            placeholder={`Search tasks... (${searchShortcut})`}
            value={searchQuery}
            onChange={(value) => setSearchQueryMutation.mutate(value)}
            className="h-9 w-full rounded-lg border border-surface-300 bg-white py-0 pr-4 pl-9 text-sm text-surface-800 outline-hidden transition-colors placeholder:text-surface-400 hover:border-surface-400 focus:border-primary-ink focus:bg-white focus:hover:border-primary-ink dark:border-surface-700 dark:bg-surface-800/80 dark:text-surface-200 dark:focus:bg-surface-800 dark:hover:border-surface-600 dark:focus:hover:border-primary-ink"
          />
        </div>

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
                <span>Sync</span>
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

          {activeView === 'recently-deleted' ? (
            <Tooltip
              content="Creating new tasks in Recently Deleted is not allowed"
              position="bottom"
            >
              {newTaskButton}
            </Tooltip>
          ) : (
            newTaskButton
          )}
        </div>
      </div>
    </header>
  );
};
