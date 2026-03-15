import { createContext } from 'react';
import { loggers } from '$lib/logger';
import type {
  AccentColor,
  KeyboardShortcut,
  Priority,
  StartOfWeek,
  SubtaskDeletionBehavior,
  Theme,
} from '$types/index';
import { applyAccentColor, applyTheme } from '$utils/color';
import { DEFAULT_COLOR, DEFAULT_DAY_OF_WEEK, DEFAULT_SHORTCUTS } from '$utils/constants';

const log = loggers.settings;

interface SettingsState {
  theme: Theme;
  accentColor: AccentColor;
  autoSync: boolean;
  syncInterval: number;
  syncOnStartup: boolean;
  syncOnReconnect: boolean;
  showCompletedByDefault: boolean;
  confirmBeforeDelete: boolean;
  confirmBeforeDeleteCalendar: boolean;
  confirmBeforeDeleteAccount: boolean;
  confirmBeforeDeleteTag: boolean;
  deleteSubtasksWithParent: SubtaskDeletionBehavior;
  startOfWeek: StartOfWeek;
  notifications: boolean;
  defaultCalendarId: string | null;
  keyboardShortcuts: KeyboardShortcut[];
  enableSystemTray: boolean;
  checkForUpdatesAutomatically: boolean;
  defaultPriority: Priority;
  defaultTags: string[];
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  onboardingCompleted: boolean;
  expandedAccountIds: string[];
  defaultAccountsExpanded: boolean;
  accountsSectionCollapsed: boolean;
  tagsSectionCollapsed: boolean;
  systemTrayRestartNeeded: boolean;
  systemTrayAppliedValue: boolean;
}

interface SettingsActions {
  setTheme: (theme: Theme) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setAccentColor: (color: AccentColor) => void;
  setAutoSync: (enabled: boolean) => void;
  setSyncInterval: (interval: number) => void;
  setSyncOnStartup: (enabled: boolean) => void;
  setSyncOnReconnect: (enabled: boolean) => void;
  setShowCompletedByDefault: (show: boolean) => void;
  setConfirmBeforeDelete: (confirm: boolean) => void;
  setConfirmBeforeDeleteCalendar: (confirm: boolean) => void;
  setConfirmBeforeDeleteAccount: (confirm: boolean) => void;
  setConfirmBeforeDeleteTag: (confirm: boolean) => void;
  setDeleteSubtasksWithParent: (behavior: SubtaskDeletionBehavior) => void;
  setStartOfWeek: (day: StartOfWeek) => void;
  setNotifications: (enabled: boolean) => void;
  setDefaultCalendarId: (calendarId: string | null) => void;
  setKeyboardShortcuts: (shortcuts: KeyboardShortcut[]) => void;
  updateShortcut: (id: string, updates: Partial<KeyboardShortcut>) => void;
  resetShortcuts: () => void;
  ensureLatestShortcuts: () => void;
  setDefaultPriority: (priority: Priority) => void;
  setDefaultTags: (tagIds: string[]) => void;
  toggleSidebarCollapsed: () => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setExpandedAccountIds: (accountIds: string[]) => void;
  toggleAccountExpanded: (accountId: string) => void;
  setDefaultAccountsExpanded: (expanded: boolean) => void;
  toggleAccountsSectionCollapsed: () => void;
  toggleTagsSectionCollapsed: () => void;
  setEnableSystemTray: (enabled: boolean) => void;
  setSystemTrayRestartNeeded: (needed: boolean) => void;
  setSystemTrayAppliedValue: (value: boolean) => void;
  setCheckForUpdatesAutomatically: (enabled: boolean) => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
}

export type SettingsStore = SettingsState & SettingsActions;

const STORAGE_KEY = 'chiri-settings';

const defaultState: SettingsState = {
  theme: 'system',
  accentColor: DEFAULT_COLOR,
  autoSync: true,
  syncInterval: 5,
  syncOnStartup: true,
  syncOnReconnect: true,
  showCompletedByDefault: true,
  confirmBeforeDelete: true,
  confirmBeforeDeleteCalendar: true,
  confirmBeforeDeleteAccount: true,
  confirmBeforeDeleteTag: true,
  deleteSubtasksWithParent: 'delete',
  startOfWeek: DEFAULT_DAY_OF_WEEK,
  notifications: true,
  defaultCalendarId: null,
  keyboardShortcuts: DEFAULT_SHORTCUTS,
  defaultPriority: 'none',
  defaultTags: [],
  sidebarCollapsed: false,
  sidebarWidth: 256,
  onboardingCompleted: false,
  expandedAccountIds: [],
  defaultAccountsExpanded: true,
  accountsSectionCollapsed: false,
  tagsSectionCollapsed: false,
  enableSystemTray: true,
  systemTrayRestartNeeded: false,
  systemTrayAppliedValue: true,
  checkForUpdatesAutomatically: true,
};

/**
 * Merges new shortcuts from defaults into existing user shortcuts
 */
const mergeShortcuts = (
  existingShortcuts: KeyboardShortcut[],
  defaultShortcuts: KeyboardShortcut[],
): KeyboardShortcut[] => {
  const existingMap = new Map(existingShortcuts.map((s) => [s.id, s]));

  return defaultShortcuts.map((defaultShortcut) => {
    const existing = existingMap.get(defaultShortcut.id);
    return existing || defaultShortcut;
  });
};

const loadFromStorage = (): { state: SettingsState; migrated: boolean } => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const loadedState = { ...defaultState, ...parsed.state };

      // Merge keyboard shortcuts to include any new defaults
      let migrated = false;
      if (parsed.state?.keyboardShortcuts) {
        const originalLength = parsed.state.keyboardShortcuts.length;
        const originalIds = parsed.state.keyboardShortcuts.map((s: KeyboardShortcut) => s.id);

        loadedState.keyboardShortcuts = mergeShortcuts(
          parsed.state.keyboardShortcuts,
          DEFAULT_SHORTCUTS,
        );

        const newLength = loadedState.keyboardShortcuts.length;
        const newIds = loadedState.keyboardShortcuts
          .filter((s: KeyboardShortcut) => !originalIds.includes(s.id))
          .map((s: KeyboardShortcut) => s.id);

        // Mark if shortcuts were added during merge
        if (newLength > originalLength) {
          migrated = true;
          log.info(
            `Migrated keyboard shortcuts: ${originalLength} → ${newLength} (added: ${newIds.join(', ')})`,
          );
        }
      }

      return { state: loadedState, migrated };
    }
  } catch (e) {
    log.error('Failed to load settings from storage:', e);
  }

  return { state: defaultState, migrated: false };
};

const saveToStorage = (state: SettingsState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version: 0 }));
  } catch (e) {
    log.error('Failed to save settings to storage:', e);
  }
};

// Singleton store for accessing state outside React
const loadResult = loadFromStorage();
let state: SettingsState = loadResult.state;
let pendingMigrationSave = loadResult.migrated;

// Apply theme and accent color immediately on module load
applyTheme(state.theme);
applyAccentColor(state.accentColor);

const listeners = new Set<() => void>();

const emitChange = () => {
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void) => {
  const isFirstSubscriber = listeners.size === 0;
  listeners.add(listener);

  // If migration happened during load and hasn't been saved yet,
  // save and notify all subscribers (including the new one)
  if (pendingMigrationSave && isFirstSubscriber) {
    saveToStorage(state);
    pendingMigrationSave = false; // Clear flag so we don't save again
    // Notify all subscribers about the migrated state
    emitChange();
  }

  return () => listeners.delete(listener);
};

const getSnapshot = () => {
  return state;
};

const setState = (partial: Partial<SettingsState>) => {
  state = { ...state, ...partial };
  saveToStorage(state);
  emitChange();
};

// Actions that can be called from anywhere
export const settingsStore = {
  getState: () => state,
  subscribe,
  getSnapshot,
  setState,

  setTheme: (theme: Theme) => setState({ theme }),
  setSidebarCollapsed: (sidebarCollapsed: boolean) => setState({ sidebarCollapsed }),
  setSidebarWidth: (sidebarWidth: number) => setState({ sidebarWidth }),
  toggleSidebarCollapsed: () => setState({ sidebarCollapsed: !state.sidebarCollapsed }),
  setAccentColor: (accentColor: AccentColor) => setState({ accentColor }),
  setAutoSync: (autoSync: boolean) => setState({ autoSync }),
  setSyncInterval: (syncInterval: number) => setState({ syncInterval }),
  setSyncOnStartup: (syncOnStartup: boolean) => setState({ syncOnStartup }),
  setSyncOnReconnect: (syncOnReconnect: boolean) => setState({ syncOnReconnect }),
  setShowCompletedByDefault: (showCompletedByDefault: boolean) =>
    setState({ showCompletedByDefault }),
  setConfirmBeforeDelete: (confirmBeforeDelete: boolean) => setState({ confirmBeforeDelete }),
  setConfirmBeforeDeleteCalendar: (confirmBeforeDeleteCalendar: boolean) =>
    setState({ confirmBeforeDeleteCalendar }),
  setConfirmBeforeDeleteAccount: (confirmBeforeDeleteAccount: boolean) =>
    setState({ confirmBeforeDeleteAccount }),
  setConfirmBeforeDeleteTag: (confirmBeforeDeleteTag: boolean) =>
    setState({ confirmBeforeDeleteTag }),
  setDeleteSubtasksWithParent: (deleteSubtasksWithParent: SubtaskDeletionBehavior) =>
    setState({ deleteSubtasksWithParent }),
  setStartOfWeek: (startOfWeek: StartOfWeek) => setState({ startOfWeek }),
  setNotifications: (notifications: boolean) => setState({ notifications }),
  setDefaultCalendarId: (defaultCalendarId: string | null) => setState({ defaultCalendarId }),
  setKeyboardShortcuts: (keyboardShortcuts: KeyboardShortcut[]) => setState({ keyboardShortcuts }),
  updateShortcut: (id: string, updates: Partial<KeyboardShortcut>) => {
    const shortcuts = state.keyboardShortcuts.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setState({ keyboardShortcuts: shortcuts });
  },
  resetShortcuts: () => {
    // Use current DEFAULT_SHORTCUTS to ensure latest defaults are applied
    setState({ keyboardShortcuts: DEFAULT_SHORTCUTS });
  },
  ensureLatestShortcuts: () => {
    // Force a check and merge of shortcuts with current defaults
    const merged = mergeShortcuts(state.keyboardShortcuts, DEFAULT_SHORTCUTS);
    const hasNewShortcuts = merged.some((m) => !state.keyboardShortcuts.find((s) => s.id === m.id));

    if (hasNewShortcuts) {
      const newCount = merged.length - state.keyboardShortcuts.length;
      log.info(`Updating shortcuts: adding ${newCount} new shortcut(s) (${merged.length} total)`);
      setState({ keyboardShortcuts: merged });
      return true;
    }

    log.debug(
      `No new shortcuts to add (current: ${state.keyboardShortcuts.length}, defaults: ${DEFAULT_SHORTCUTS.length})`,
    );
    return false;
  },
  setDefaultPriority: (defaultPriority: Priority) => setState({ defaultPriority }),
  setDefaultTags: (defaultTags: string[]) => setState({ defaultTags }),
  setOnboardingCompleted: (onboardingCompleted: boolean) => setState({ onboardingCompleted }),
  setExpandedAccountIds: (expandedAccountIds: string[]) => setState({ expandedAccountIds }),
  toggleAccountExpanded: (accountId: string) => {
    const current = state.expandedAccountIds;
    if (current.includes(accountId)) {
      setState({ expandedAccountIds: current.filter((id) => id !== accountId) });
    } else {
      setState({ expandedAccountIds: [...current, accountId] });
    }
  },
  setDefaultAccountsExpanded: (defaultAccountsExpanded: boolean) =>
    setState({ defaultAccountsExpanded }),
  toggleAccountsSectionCollapsed: () =>
    setState({ accountsSectionCollapsed: !state.accountsSectionCollapsed }),
  toggleTagsSectionCollapsed: () => setState({ tagsSectionCollapsed: !state.tagsSectionCollapsed }),
  setEnableSystemTray: (enableSystemTray: boolean) => setState({ enableSystemTray }),
  setSystemTrayRestartNeeded: (systemTrayRestartNeeded: boolean) =>
    setState({ systemTrayRestartNeeded }),
  setSystemTrayAppliedValue: (systemTrayAppliedValue: boolean) =>
    setState({ systemTrayAppliedValue }),
  setCheckForUpdatesAutomatically: (checkForUpdatesAutomatically: boolean) =>
    setState({ checkForUpdatesAutomatically }),

  exportSettings: () => {
    const exportData = {
      version: 1,
      ...state,
    };
    return JSON.stringify(exportData, null, 2);
  },

  importSettings: (json: string) => {
    try {
      const data = JSON.parse(json);
      if (data.version !== 1) {
        log.error('Unsupported settings version');
        return false;
      }
      setState({
        theme: data.theme ?? defaultState.theme,
        accentColor: data.accentColor ?? defaultState.accentColor,
        autoSync: data.autoSync ?? defaultState.autoSync,
        syncInterval: data.syncInterval ?? defaultState.syncInterval,
        syncOnStartup: data.syncOnStartup ?? defaultState.syncOnStartup,
        syncOnReconnect: data.syncOnReconnect ?? defaultState.syncOnReconnect,
        showCompletedByDefault: data.showCompletedByDefault ?? defaultState.showCompletedByDefault,
        confirmBeforeDelete: data.confirmBeforeDelete ?? defaultState.confirmBeforeDelete,
        confirmBeforeDeleteCalendar:
          data.confirmBeforeDeleteCalendar ?? defaultState.confirmBeforeDeleteCalendar,
        confirmBeforeDeleteAccount:
          data.confirmBeforeDeleteAccount ?? defaultState.confirmBeforeDeleteAccount,
        confirmBeforeDeleteTag: data.confirmBeforeDeleteTag ?? defaultState.confirmBeforeDeleteTag,
        deleteSubtasksWithParent:
          data.deleteSubtasksWithParent ?? defaultState.deleteSubtasksWithParent,
        startOfWeek: data.startOfWeek ?? defaultState.startOfWeek,
        notifications: data.notifications ?? defaultState.notifications,
        defaultCalendarId: data.defaultCalendarId ?? defaultState.defaultCalendarId,
        keyboardShortcuts: data.keyboardShortcuts
          ? mergeShortcuts(data.keyboardShortcuts, DEFAULT_SHORTCUTS)
          : defaultState.keyboardShortcuts,
        defaultPriority: data.defaultPriority ?? defaultState.defaultPriority,
        defaultTags: data.defaultTags ?? defaultState.defaultTags,
        sidebarCollapsed: data.sidebarCollapsed ?? defaultState.sidebarCollapsed,
        sidebarWidth: data.sidebarWidth ?? defaultState.sidebarWidth,
        onboardingCompleted: data.onboardingCompleted ?? defaultState.onboardingCompleted,
        expandedAccountIds: data.expandedAccountIds ?? defaultState.expandedAccountIds,
        defaultAccountsExpanded:
          data.defaultAccountsExpanded ?? defaultState.defaultAccountsExpanded,
        accountsSectionCollapsed:
          data.accountsSectionCollapsed ?? defaultState.accountsSectionCollapsed,
        tagsSectionCollapsed: data.tagsSectionCollapsed ?? defaultState.tagsSectionCollapsed,
        enableSystemTray: data.enableSystemTray ?? defaultState.enableSystemTray,
        systemTrayRestartNeeded:
          data.systemTrayRestartNeeded ?? defaultState.systemTrayRestartNeeded,
        systemTrayAppliedValue: data.systemTrayAppliedValue ?? defaultState.systemTrayAppliedValue,
        checkForUpdatesAutomatically:
          data.checkForUpdatesAutomatically ?? defaultState.checkForUpdatesAutomatically,
      });
      return true;
    } catch (e) {
      log.error('Failed to import settings:', e);
      return false;
    }
  },
};

// Context for React components
export const SettingsContext = createContext<SettingsStore | null>(null);
