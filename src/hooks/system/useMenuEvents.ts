import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { DEFAULT_SORT_CONFIG } from '$constants';
import { MENU_EVENTS } from '$constants/menu';
import { useUIState } from '$hooks/queries/useUIState';
import { loggers } from '$lib/logger';
import type { SortDirection, SortMode } from '$types';
import { isCEF } from '$utils/platform';

const log = loggers.menu;

/**
 * Hook to listen for menu events and handle them appropriately
 * Should be used in the root App component
 */
export const useMenuEvents = (callbacks: {
  onNewTask?: React.RefObject<(() => void) | null>;
  onOpenSettings?: React.RefObject<(() => void) | null>;
  onOpenImport?: React.RefObject<(() => void) | null>;
  onOpenAccount?: React.RefObject<(() => void) | null>;
  onEditAccount?: React.RefObject<((accountId: string) => void) | null>;
  onOpenCreateCalendar?: React.RefObject<((accountId?: string) => void) | null>;
  onSearch?: React.RefObject<(() => void) | null>;
  onOpenAbout?: React.RefObject<(() => void) | null>;
  onOpenKeyboardShortcuts?: React.RefObject<(() => void) | null>;
  onToggleCompleted?: React.RefObject<((currentValue: boolean) => void) | null>;
  onToggleUnstarted?: React.RefObject<((currentValue: boolean) => void) | null>;
  onSync?: React.RefObject<(() => void) | null>;
  onSetSortMode?: React.RefObject<
    ((mode: SortMode, currentMode: SortMode, currentDirection: SortDirection) => void) | null
  >;
  onSetSortDirection?: React.RefObject<
    ((direction: SortDirection, currentMode: SortMode) => void) | null
  >;
  onToggleSidebar?: React.RefObject<(() => void) | null>;
  onDeleteTask?: React.RefObject<(() => void) | null>;
  onNavPrevList?: React.RefObject<(() => void) | null>;
  onNavNextList?: React.RefObject<(() => void) | null>;
  onCheckForUpdates?: React.RefObject<(() => void) | null>;
  onShowChangelog?: React.RefObject<(() => void) | null>;
  onRemoveAccount?: React.RefObject<((accountId: string) => void) | null>;
  onSyncCalendar?: React.RefObject<((calendarId: string, accountId: string) => void) | null>;
  onEditCalendar?: React.RefObject<((calendarId: string, accountId: string) => void) | null>;
  onExportCalendar?: React.RefObject<((calendarId: string, accountId: string) => void) | null>;
  onDeleteCalendar?: React.RefObject<((calendarId: string, accountId: string) => void) | null>;
}) => {
  const { data: uiState } = useUIState();

  useEffect(() => {
    // Skip menu event listeners under CEF - menu IPC causes deadlocks
    // TODO: Figure out how to support the app menu on macOS under CEF.
    if (isCEF()) {
      log.debug('Skipping menu event listeners (CEF runtime)');
      return;
    }

    let isActive = true;
    const unlistenCallbacks: (() => void)[] = [];

    const setupListeners = async () => {
      // New Task
      const unlistenNewTask = await listen(MENU_EVENTS.NEW_TASK, () => {
        log.debug('New Task triggered');
        callbacks.onNewTask?.current?.();
      });
      if (!isActive) {
        unlistenNewTask();
        return;
      }
      unlistenCallbacks.push(unlistenNewTask);

      // Sync
      const unlistenSync = await listen(MENU_EVENTS.SYNC, () => {
        log.debug('Sync triggered');
        callbacks.onSync?.current?.();
      });
      if (!isActive) {
        unlistenSync();
        return;
      }
      unlistenCallbacks.push(unlistenSync);

      // Preferences
      const unlistenPreferences = await listen(MENU_EVENTS.PREFERENCES, () => {
        log.debug('Preferences triggered');
        callbacks.onOpenSettings?.current?.();
      });
      if (!isActive) {
        unlistenPreferences();
        return;
      }
      unlistenCallbacks.push(unlistenPreferences);

      // Add Account
      const unlistenAddAccount = await listen(MENU_EVENTS.ADD_ACCOUNT, () => {
        log.debug('Add Account triggered');
        callbacks.onOpenAccount?.current?.();
      });
      if (!isActive) {
        unlistenAddAccount();
        return;
      }
      unlistenCallbacks.push(unlistenAddAccount);

      // Edit Account
      const unlistenEditAccount = await listen<{ accountId: string }>(
        MENU_EVENTS.EDIT_ACCOUNT,
        (event) => {
          log.debug('Edit Account triggered', event.payload.accountId);
          callbacks.onEditAccount?.current?.(event.payload.accountId);
        },
      );
      if (!isActive) {
        unlistenEditAccount();
        return;
      }
      unlistenCallbacks.push(unlistenEditAccount);

      // Add Calendar
      const unlistenAddCalendar = await listen<{ accountId: string | null }>(
        MENU_EVENTS.ADD_CALENDAR,
        (event) => {
          log.debug('Add Calendar triggered', event.payload.accountId);
          callbacks.onOpenCreateCalendar?.current?.(event.payload.accountId ?? undefined);
        },
      );
      if (!isActive) {
        unlistenAddCalendar();
        return;
      }
      unlistenCallbacks.push(unlistenAddCalendar);

      // Import Tasks
      const unlistenImport = await listen(MENU_EVENTS.IMPORT_TASKS, () => {
        log.debug('Import Tasks triggered');
        callbacks.onOpenImport?.current?.();
      });
      if (!isActive) {
        unlistenImport();
        return;
      }
      unlistenCallbacks.push(unlistenImport);

      // Search
      const unlistenSearch = await listen(MENU_EVENTS.SEARCH, () => {
        log.debug('Search triggered');
        callbacks.onSearch?.current?.();
      });
      if (!isActive) {
        unlistenSearch();
        return;
      }
      unlistenCallbacks.push(unlistenSearch);

      // About
      const unlistenAbout = await listen(MENU_EVENTS.ABOUT, () => {
        log.debug('About triggered');
        callbacks.onOpenAbout?.current?.();
      });
      if (!isActive) {
        unlistenAbout();
        return;
      }
      unlistenCallbacks.push(unlistenAbout);

      // Show Keyboard Shortcuts
      const unlistenShortcuts = await listen(MENU_EVENTS.SHOW_KEYBOARD_SHORTCUTS, () => {
        log.debug('Show Keyboard Shortcuts triggered');
        callbacks.onOpenKeyboardShortcuts?.current?.();
      });
      if (!isActive) {
        unlistenShortcuts();
        return;
      }
      unlistenCallbacks.push(unlistenShortcuts);

      // Toggle Completed Tasks
      const unlistenToggleCompleted = await listen(MENU_EVENTS.TOGGLE_COMPLETED, () => {
        log.debug('Toggle Completed triggered');
        const showCompleted = uiState?.showCompletedTasks ?? true;
        callbacks.onToggleCompleted?.current?.(showCompleted);
      });
      if (!isActive) {
        unlistenToggleCompleted();
        return;
      }
      unlistenCallbacks.push(unlistenToggleCompleted);

      // Toggle Unstarted Tasks
      const unlistenToggleUnstarted = await listen(MENU_EVENTS.TOGGLE_UNSTARTED, () => {
        log.debug('Toggle Unstarted triggered');
        const showUnstarted = uiState?.showUnstartedTasks ?? true;
        callbacks.onToggleUnstarted?.current?.(showUnstarted);
      });
      if (!isActive) {
        unlistenToggleUnstarted();
        return;
      }
      unlistenCallbacks.push(unlistenToggleUnstarted);

      // Toggle Sidebar
      const unlistenToggleSidebar = await listen(MENU_EVENTS.TOGGLE_SIDEBAR, () => {
        log.debug('Toggle Sidebar triggered');
        callbacks.onToggleSidebar?.current?.();
      });
      if (!isActive) {
        unlistenToggleSidebar();
        return;
      }
      unlistenCallbacks.push(unlistenToggleSidebar);

      // Delete Task
      const unlistenDeleteTask = await listen(MENU_EVENTS.DELETE_TASK, () => {
        log.debug('Delete Task triggered');
        callbacks.onDeleteTask?.current?.();
      });
      if (!isActive) {
        unlistenDeleteTask();
        return;
      }
      unlistenCallbacks.push(unlistenDeleteTask);

      // Navigate Previous List
      const unlistenNavPrevList = await listen(MENU_EVENTS.NAV_PREV_LIST, () => {
        log.debug('Nav Prev List triggered');
        callbacks.onNavPrevList?.current?.();
      });
      if (!isActive) {
        unlistenNavPrevList();
        return;
      }
      unlistenCallbacks.push(unlistenNavPrevList);

      // Navigate Next List
      const unlistenNavNextList = await listen(MENU_EVENTS.NAV_NEXT_LIST, () => {
        log.debug('Nav Next List triggered');
        callbacks.onNavNextList?.current?.();
      });
      if (!isActive) {
        unlistenNavNextList();
        return;
      }
      unlistenCallbacks.push(unlistenNavNextList);

      // Check for Updates
      const unlistenCheckForUpdates = await listen(MENU_EVENTS.CHECK_FOR_UPDATES, () => {
        log.debug('Check for Updates triggered');
        callbacks.onCheckForUpdates?.current?.();
      });
      if (!isActive) {
        unlistenCheckForUpdates();
        return;
      }
      unlistenCallbacks.push(unlistenCheckForUpdates);

      // Show Changelog
      const unlistenShowChangelog = await listen(MENU_EVENTS.SHOW_CHANGELOG, () => {
        log.debug('Show Changelog triggered');
        callbacks.onShowChangelog?.current?.();
      });
      if (!isActive) {
        unlistenShowChangelog();
        return;
      }
      unlistenCallbacks.push(unlistenShowChangelog);

      // Remove Account
      const unlistenRemoveAccount = await listen<{ accountId: string }>(
        MENU_EVENTS.REMOVE_ACCOUNT,
        (event) => {
          log.debug('Remove Account triggered', event.payload.accountId);
          callbacks.onRemoveAccount?.current?.(event.payload.accountId);
        },
      );
      if (!isActive) {
        unlistenRemoveAccount();
        return;
      }
      unlistenCallbacks.push(unlistenRemoveAccount);

      // Sync Calendar
      const unlistenSyncCalendar = await listen<{ calendarId: string; accountId: string }>(
        MENU_EVENTS.SYNC_CALENDAR,
        (event) => {
          log.debug('Sync Calendar triggered', event.payload.calendarId);
          callbacks.onSyncCalendar?.current?.(event.payload.calendarId, event.payload.accountId);
        },
      );
      if (!isActive) {
        unlistenSyncCalendar();
        return;
      }
      unlistenCallbacks.push(unlistenSyncCalendar);

      // Edit Calendar
      const unlistenEditCalendar = await listen<{ calendarId: string; accountId: string }>(
        MENU_EVENTS.EDIT_CALENDAR,
        (event) => {
          log.debug('Edit Calendar triggered', event.payload.calendarId);
          callbacks.onEditCalendar?.current?.(event.payload.calendarId, event.payload.accountId);
        },
      );
      if (!isActive) {
        unlistenEditCalendar();
        return;
      }
      unlistenCallbacks.push(unlistenEditCalendar);

      // Export Calendar
      const unlistenExportCalendar = await listen<{ calendarId: string; accountId: string }>(
        MENU_EVENTS.EXPORT_CALENDAR,
        (event) => {
          log.debug('Export Calendar triggered', event.payload.calendarId);
          callbacks.onExportCalendar?.current?.(event.payload.calendarId, event.payload.accountId);
        },
      );
      if (!isActive) {
        unlistenExportCalendar();
        return;
      }
      unlistenCallbacks.push(unlistenExportCalendar);

      // Delete Calendar
      const unlistenDeleteCalendar = await listen<{ calendarId: string; accountId: string }>(
        MENU_EVENTS.DELETE_CALENDAR,
        (event) => {
          log.debug('Delete Calendar triggered', event.payload.calendarId);
          callbacks.onDeleteCalendar?.current?.(event.payload.calendarId, event.payload.accountId);
        },
      );
      if (!isActive) {
        unlistenDeleteCalendar();
        return;
      }
      unlistenCallbacks.push(unlistenDeleteCalendar);

      // Sort Mode handlers
      const sortModeMap: Record<string, SortMode> = {
        [MENU_EVENTS.SORT_MANUAL]: 'manual',
        [MENU_EVENTS.SORT_SMART]: 'smart',
        [MENU_EVENTS.SORT_START_DATE]: 'start-date',
        [MENU_EVENTS.SORT_DUE_DATE]: 'due-date',
        [MENU_EVENTS.SORT_PRIORITY]: 'priority',
        [MENU_EVENTS.SORT_TITLE]: 'title',
        [MENU_EVENTS.SORT_CREATED]: 'created',
        [MENU_EVENTS.SORT_MODIFIED]: 'modified',
      };

      for (const [event, mode] of Object.entries(sortModeMap)) {
        const unlisten = await listen(event, () => {
          log.debug(`Sort ${mode} triggered`);
          const currentMode = uiState?.sortConfig?.mode ?? DEFAULT_SORT_CONFIG.mode;
          const currentDirection = uiState?.sortConfig?.direction ?? DEFAULT_SORT_CONFIG.direction;
          callbacks.onSetSortMode?.current?.(mode, currentMode, currentDirection);
        });
        if (!isActive) {
          unlisten();
          return;
        }
        unlistenCallbacks.push(unlisten);
      }

      // Sort Direction Ascending
      const unlistenSortDirectionAsc = await listen(MENU_EVENTS.SORT_DIRECTION_ASC, () => {
        log.debug('Sort Direction Ascending triggered');
        const currentMode = uiState?.sortConfig?.mode ?? DEFAULT_SORT_CONFIG.mode;
        callbacks.onSetSortDirection?.current?.('asc', currentMode);
      });
      if (!isActive) {
        unlistenSortDirectionAsc();
        return;
      }
      unlistenCallbacks.push(unlistenSortDirectionAsc);

      // Sort Direction Descending
      const unlistenSortDirectionDesc = await listen(MENU_EVENTS.SORT_DIRECTION_DESC, () => {
        log.debug('Sort Direction Descending triggered');
        const currentMode = uiState?.sortConfig?.mode ?? DEFAULT_SORT_CONFIG.mode;
        callbacks.onSetSortDirection?.current?.('desc', currentMode);
      });
      if (!isActive) {
        unlistenSortDirectionDesc();
        return;
      }
      unlistenCallbacks.push(unlistenSortDirectionDesc);
    };

    setupListeners().catch((error) => {
      log.error('Failed to setup menu event listeners:', error);
    });

    // Cleanup
    return () => {
      isActive = false;
      unlistenCallbacks.forEach((unlisten) => {
        unlisten();
      });
    };
  }, [callbacks, uiState]);
};
