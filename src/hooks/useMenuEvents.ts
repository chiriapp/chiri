import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { useSyncQuery, useUIState } from '@/hooks/queries';
import { createLogger } from '@/lib/logger';
import type { SortDirection, SortMode } from '@/types';
import { DEFAULT_SORT_CONFIG } from '@/utils/constants';
import { MENU_EVENTS } from '@/utils/menu';
import { isCEF } from '@/utils/platform';

const log = createLogger('Menu', '#0ea5e9');

/**
 * Hook to listen for menu events and handle them appropriately
 * Should be used in the root App component
 */
export function useMenuEvents(callbacks: {
  onNewTask?: React.RefObject<(() => void) | null>;
  onOpenSettings?: React.RefObject<(() => void) | null>;
  onOpenImport?: React.RefObject<(() => void) | null>;
  onOpenExport?: React.RefObject<(() => void) | null>;
  onOpenAccount?: React.RefObject<(() => void) | null>;
  onEditAccount?: React.RefObject<((accountId: string) => void) | null>;
  onOpenCreateCalendar?: React.RefObject<(() => void) | null>;
  onSearch?: React.RefObject<(() => void) | null>;
  onOpenAbout?: React.RefObject<(() => void) | null>;
  onOpenKeyboardShortcuts?: React.RefObject<(() => void) | null>;
  onToggleCompleted?: React.RefObject<((currentValue: boolean) => void) | null>;
  onSetSortMode?: React.RefObject<
    ((mode: SortMode, currentMode: SortMode, currentDirection: SortDirection) => void) | null
  >;
}) {
  const { syncAll } = useSyncQuery();
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
        syncAll();
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
      const unlistenAddCalendar = await listen(MENU_EVENTS.ADD_CALENDAR, () => {
        log.debug('Add Calendar triggered');
        callbacks.onOpenCreateCalendar?.current?.();
      });
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

      // Export Tasks
      const unlistenExport = await listen(MENU_EVENTS.EXPORT_TASKS, () => {
        log.debug('Export Tasks triggered');
        callbacks.onOpenExport?.current?.();
      });
      if (!isActive) {
        unlistenExport();
        return;
      }
      unlistenCallbacks.push(unlistenExport);

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
  }, [syncAll, callbacks, uiState]);
}
