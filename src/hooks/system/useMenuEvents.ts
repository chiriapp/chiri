import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { DEFAULT_SORT_CONFIG } from '$constants';
import { MENU_EVENTS } from '$constants/menu';
import { useUIState } from '$hooks/queries/useUIState';
import { loggers } from '$lib/logger';
import type { SortDirection, SortMode } from '$types';
import { isCEF } from '$utils/platform';

const log = loggers.menu;

interface MenuCallbacks {
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
}

// Simple event configuration for events that just call a callback
type SimpleEventConfig = {
  event: string;
  callback: keyof MenuCallbacks;
  label: string;
};

// Parameterized event configuration for events with payloads
type ParamEventConfig = {
  event: string;
  label: string;
  handler: (callbacks: MenuCallbacks, payload: Record<string, unknown>) => void;
};

const SIMPLE_EVENTS: SimpleEventConfig[] = [
  { event: MENU_EVENTS.NEW_TASK, callback: 'onNewTask', label: 'New Task' },
  { event: MENU_EVENTS.SYNC, callback: 'onSync', label: 'Sync' },
  { event: MENU_EVENTS.PREFERENCES, callback: 'onOpenSettings', label: 'Preferences' },
  { event: MENU_EVENTS.ADD_ACCOUNT, callback: 'onOpenAccount', label: 'Add Account' },
  { event: MENU_EVENTS.IMPORT_TASKS, callback: 'onOpenImport', label: 'Import Tasks' },
  { event: MENU_EVENTS.SEARCH, callback: 'onSearch', label: 'Search' },
  { event: MENU_EVENTS.ABOUT, callback: 'onOpenAbout', label: 'About' },
  {
    event: MENU_EVENTS.SHOW_KEYBOARD_SHORTCUTS,
    callback: 'onOpenKeyboardShortcuts',
    label: 'Show Keyboard Shortcuts',
  },
  { event: MENU_EVENTS.TOGGLE_SIDEBAR, callback: 'onToggleSidebar', label: 'Toggle Sidebar' },
  { event: MENU_EVENTS.DELETE_TASK, callback: 'onDeleteTask', label: 'Delete Task' },
  { event: MENU_EVENTS.NAV_PREV_LIST, callback: 'onNavPrevList', label: 'Nav Prev List' },
  { event: MENU_EVENTS.NAV_NEXT_LIST, callback: 'onNavNextList', label: 'Nav Next List' },
  {
    event: MENU_EVENTS.CHECK_FOR_UPDATES,
    callback: 'onCheckForUpdates',
    label: 'Check for Updates',
  },
  { event: MENU_EVENTS.SHOW_CHANGELOG, callback: 'onShowChangelog', label: 'Show Changelog' },
];

const PARAM_EVENTS: ParamEventConfig[] = [
  {
    event: MENU_EVENTS.EDIT_ACCOUNT,
    label: 'Edit Account',
    handler: (cb, p) => cb.onEditAccount?.current?.(p.accountId as string),
  },
  {
    event: MENU_EVENTS.ADD_CALENDAR,
    label: 'Add Calendar',
    handler: (cb, p) => cb.onOpenCreateCalendar?.current?.((p.accountId as string) ?? undefined),
  },
  {
    event: MENU_EVENTS.REMOVE_ACCOUNT,
    label: 'Remove Account',
    handler: (cb, p) => cb.onRemoveAccount?.current?.(p.accountId as string),
  },
  {
    event: MENU_EVENTS.SYNC_CALENDAR,
    label: 'Sync Calendar',
    handler: (cb, p) => cb.onSyncCalendar?.current?.(p.calendarId as string, p.accountId as string),
  },
  {
    event: MENU_EVENTS.EDIT_CALENDAR,
    label: 'Edit Calendar',
    handler: (cb, p) => cb.onEditCalendar?.current?.(p.calendarId as string, p.accountId as string),
  },
  {
    event: MENU_EVENTS.EXPORT_CALENDAR,
    label: 'Export Calendar',
    handler: (cb, p) =>
      cb.onExportCalendar?.current?.(p.calendarId as string, p.accountId as string),
  },
  {
    event: MENU_EVENTS.DELETE_CALENDAR,
    label: 'Delete Calendar',
    handler: (cb, p) =>
      cb.onDeleteCalendar?.current?.(p.calendarId as string, p.accountId as string),
  },
];

const SORT_MODE_MAP: Record<string, SortMode> = {
  [MENU_EVENTS.SORT_MANUAL]: 'manual',
  [MENU_EVENTS.SORT_SMART]: 'smart',
  [MENU_EVENTS.SORT_START_DATE]: 'start-date',
  [MENU_EVENTS.SORT_DUE_DATE]: 'due-date',
  [MENU_EVENTS.SORT_PRIORITY]: 'priority',
  [MENU_EVENTS.SORT_TITLE]: 'title',
  [MENU_EVENTS.SORT_CREATED]: 'created',
  [MENU_EVENTS.SORT_MODIFIED]: 'modified',
};

/**
 * Register a single listener and track cleanup
 */
const registerListener = async <T = unknown>(
  event: string,
  handler: (payload: T) => void,
  unlistenCallbacks: (() => void)[],
  isActiveRef: { current: boolean },
): Promise<boolean> => {
  const unlisten = await listen<T>(event, (e) => handler(e.payload as T));
  if (!isActiveRef.current) {
    unlisten();
    return false;
  }
  unlistenCallbacks.push(unlisten);
  return true;
};

// Helper: register all simple events
const registerSimpleEvents = async (
  callbacks: MenuCallbacks,
  unlistenCallbacks: (() => void)[],
  isActiveRef: { current: boolean },
): Promise<boolean> => {
  for (const config of SIMPLE_EVENTS) {
    const success = await registerListener(
      config.event,
      () => {
        log.debug(`${config.label} triggered`);
        const cb = callbacks[config.callback];
        if (cb && 'current' in cb) {
          (cb.current as (() => void) | null)?.();
        }
      },
      unlistenCallbacks,
      isActiveRef,
    );
    if (!success) return false;
  }
  return true;
};

// Helper: register parameterized events
const registerParamEvents = async (
  callbacks: MenuCallbacks,
  unlistenCallbacks: (() => void)[],
  isActiveRef: { current: boolean },
): Promise<boolean> => {
  for (const config of PARAM_EVENTS) {
    const success = await registerListener<Record<string, unknown>>(
      config.event,
      (payload) => {
        log.debug(`${config.label} triggered`, payload);
        config.handler(callbacks, payload);
      },
      unlistenCallbacks,
      isActiveRef,
    );
    if (!success) return false;
  }
  return true;
};

// Helper: register sort mode events
const registerSortModeEvents = async (
  callbacks: MenuCallbacks,
  uiState: ReturnType<typeof useUIState>['data'],
  unlistenCallbacks: (() => void)[],
  isActiveRef: { current: boolean },
): Promise<boolean> => {
  for (const [event, mode] of Object.entries(SORT_MODE_MAP)) {
    const success = await registerListener(
      event,
      () => {
        log.debug(`Sort ${mode} triggered`);
        const currentMode = uiState?.sortConfig?.mode ?? DEFAULT_SORT_CONFIG.mode;
        const currentDirection = uiState?.sortConfig?.direction ?? DEFAULT_SORT_CONFIG.direction;
        callbacks.onSetSortMode?.current?.(mode, currentMode, currentDirection);
      },
      unlistenCallbacks,
      isActiveRef,
    );
    if (!success) return false;
  }
  return true;
};

// Helper: register sort direction events
const registerSortDirectionEvents = async (
  callbacks: MenuCallbacks,
  uiState: ReturnType<typeof useUIState>['data'],
  unlistenCallbacks: (() => void)[],
  isActiveRef: { current: boolean },
): Promise<boolean> => {
  const sortDirections: Array<{ event: string; direction: SortDirection; label: string }> = [
    { event: MENU_EVENTS.SORT_DIRECTION_ASC, direction: 'asc', label: 'Ascending' },
    { event: MENU_EVENTS.SORT_DIRECTION_DESC, direction: 'desc', label: 'Descending' },
  ];

  for (const { event, direction, label } of sortDirections) {
    const success = await registerListener(
      event,
      () => {
        log.debug(`Sort Direction ${label} triggered`);
        const currentMode = uiState?.sortConfig?.mode ?? DEFAULT_SORT_CONFIG.mode;
        callbacks.onSetSortDirection?.current?.(direction, currentMode);
      },
      unlistenCallbacks,
      isActiveRef,
    );
    if (!success) return false;
  }
  return true;
};

/**
 * Hook to listen for menu events and handle them appropriately
 * Should be used in the root App component
 */
export const useMenuEvents = (callbacks: MenuCallbacks) => {
  const { data: uiState } = useUIState();

  useEffect(() => {
    // Skip menu event listeners under CEF - menu IPC causes deadlocks
    if (isCEF()) {
      log.debug('Skipping menu event listeners (CEF runtime)');
      return;
    }

    const isActiveRef = { current: true };
    const unlistenCallbacks: (() => void)[] = [];

    const setupListeners = async () => {
      // Register simple events (no payload)
      if (!(await registerSimpleEvents(callbacks, unlistenCallbacks, isActiveRef))) return;

      // Register toggle events (need current UI state)
      const toggleSuccess = await registerListener(
        MENU_EVENTS.TOGGLE_COMPLETED,
        () => {
          log.debug('Toggle Completed triggered');
          callbacks.onToggleCompleted?.current?.(uiState?.showCompletedTasks ?? true);
        },
        unlistenCallbacks,
        isActiveRef,
      );
      if (!toggleSuccess) return;

      const toggleUnstartedSuccess = await registerListener(
        MENU_EVENTS.TOGGLE_UNSTARTED,
        () => {
          log.debug('Toggle Unstarted triggered');
          callbacks.onToggleUnstarted?.current?.(uiState?.showUnstartedTasks ?? true);
        },
        unlistenCallbacks,
        isActiveRef,
      );
      if (!toggleUnstartedSuccess) return;

      // Register parameterized events (with payload)
      if (!(await registerParamEvents(callbacks, unlistenCallbacks, isActiveRef))) return;

      // Register sort mode events
      if (!(await registerSortModeEvents(callbacks, uiState, unlistenCallbacks, isActiveRef)))
        return;

      // Register sort direction events
      if (!(await registerSortDirectionEvents(callbacks, uiState, unlistenCallbacks, isActiveRef)))
        return;
    };

    setupListeners().catch((error) => {
      log.error('Failed to setup menu event listeners:', error);
    });

    return () => {
      isActiveRef.current = false;
      for (const unlisten of unlistenCallbacks) {
        unlisten();
      }
    };
  }, [callbacks, uiState]);
};
