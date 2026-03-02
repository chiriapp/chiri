import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useSyncExternalStore,
} from 'react';
import { createLogger } from '@/lib/logger';
import type {
  AccentColor,
  KeyboardShortcut,
  Priority,
  StartOfWeek,
  SubtaskDeletionBehavior,
  Theme,
} from '@/types';
import { applyAccentColor, applyTheme } from '@/utils/color';
import { DEFAULT_COLOR, DEFAULT_DAY_OF_WEEK, DEFAULT_SHORTCUTS } from '@/utils/constants';

const log = createLogger('Settings', '#d946ef');

interface SettingsState {
  theme: Theme;
  accentColor: AccentColor;
  autoSync: boolean;
  syncInterval: number;
  syncOnStartup: boolean;
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

const STORAGE_KEY = 'caldav-tasks-settings';

const defaultState: SettingsState = {
  theme: 'system',
  accentColor: DEFAULT_COLOR,
  autoSync: true,
  syncInterval: 5,
  syncOnStartup: true,
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

function loadFromStorage(): SettingsState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new settings
      return { ...defaultState, ...parsed.state };
    }
  } catch (e) {
    log.error('Failed to load settings from storage:', e);
  }

  return defaultState;
}

function saveToStorage(state: SettingsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version: 0 }));
  } catch (e) {
    log.error('Failed to save settings to storage:', e);
  }
}

// Singleton store for accessing state outside React
let state: SettingsState = loadFromStorage();

// Apply theme and accent color immediately on module load
applyTheme(state.theme);
applyAccentColor(state.accentColor);

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function setState(partial: Partial<SettingsState>) {
  state = { ...state, ...partial };
  saveToStorage(state);
  emitChange();
}

// Actions that can be called from anywhere
export const settingsStore = {
  getState: () => state,
  setState,

  setTheme: (theme: Theme) => setState({ theme }),
  setSidebarCollapsed: (sidebarCollapsed: boolean) => setState({ sidebarCollapsed }),
  setSidebarWidth: (sidebarWidth: number) => setState({ sidebarWidth }),
  toggleSidebarCollapsed: () => setState({ sidebarCollapsed: !state.sidebarCollapsed }),
  setAccentColor: (accentColor: AccentColor) => setState({ accentColor }),
  setAutoSync: (autoSync: boolean) => setState({ autoSync }),
  setSyncInterval: (syncInterval: number) => setState({ syncInterval }),
  setSyncOnStartup: (syncOnStartup: boolean) => setState({ syncOnStartup }),
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
  resetShortcuts: () => setState({ keyboardShortcuts: DEFAULT_SHORTCUTS }),
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
        keyboardShortcuts: data.keyboardShortcuts ?? defaultState.keyboardShortcuts,
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
const SettingsContext = createContext<SettingsStore | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const currentState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setTheme = useCallback((theme: Theme) => settingsStore.setTheme(theme), []);
  const setSidebarCollapsed = useCallback(
    (collapsed: boolean) => settingsStore.setSidebarCollapsed(collapsed),
    [],
  );
  const setSidebarWidth = useCallback((width: number) => settingsStore.setSidebarWidth(width), []);
  const toggleSidebarCollapsed = useCallback(() => settingsStore.toggleSidebarCollapsed(), []);
  const setAccentColor = useCallback(
    (color: AccentColor) => settingsStore.setAccentColor(color),
    [],
  );
  const setAutoSync = useCallback((enabled: boolean) => settingsStore.setAutoSync(enabled), []);
  const setSyncInterval = useCallback(
    (interval: number) => settingsStore.setSyncInterval(interval),
    [],
  );
  const setSyncOnStartup = useCallback(
    (enabled: boolean) => settingsStore.setSyncOnStartup(enabled),
    [],
  );
  const setShowCompletedByDefault = useCallback(
    (show: boolean) => settingsStore.setShowCompletedByDefault(show),
    [],
  );
  const setConfirmBeforeDelete = useCallback(
    (confirm: boolean) => settingsStore.setConfirmBeforeDelete(confirm),
    [],
  );
  const setConfirmBeforeDeleteCalendar = useCallback(
    (confirm: boolean) => settingsStore.setConfirmBeforeDeleteCalendar(confirm),
    [],
  );
  const setConfirmBeforeDeleteAccount = useCallback(
    (confirm: boolean) => settingsStore.setConfirmBeforeDeleteAccount(confirm),
    [],
  );
  const setConfirmBeforeDeleteTag = useCallback(
    (confirm: boolean) => settingsStore.setConfirmBeforeDeleteTag(confirm),
    [],
  );
  const setDeleteSubtasksWithParent = useCallback(
    (behavior: SubtaskDeletionBehavior) => settingsStore.setDeleteSubtasksWithParent(behavior),
    [],
  );
  const setStartOfWeek = useCallback((day: StartOfWeek) => settingsStore.setStartOfWeek(day), []);
  const setNotifications = useCallback(
    (enabled: boolean) => settingsStore.setNotifications(enabled),
    [],
  );
  const setDefaultCalendarId = useCallback(
    (calendarId: string | null) => settingsStore.setDefaultCalendarId(calendarId),
    [],
  );
  const setKeyboardShortcuts = useCallback(
    (shortcuts: KeyboardShortcut[]) => settingsStore.setKeyboardShortcuts(shortcuts),
    [],
  );
  const updateShortcut = useCallback(
    (id: string, updates: Partial<KeyboardShortcut>) => settingsStore.updateShortcut(id, updates),
    [],
  );
  const resetShortcuts = useCallback(() => settingsStore.resetShortcuts(), []);
  const setDefaultPriority = useCallback(
    (priority: Priority) => settingsStore.setDefaultPriority(priority),
    [],
  );
  const setDefaultTags = useCallback(
    (tagIds: string[]) => settingsStore.setDefaultTags(tagIds),
    [],
  );
  const setOnboardingCompleted = useCallback(
    (completed: boolean) => settingsStore.setOnboardingCompleted(completed),
    [],
  );
  const setExpandedAccountIds = useCallback(
    (accountIds: string[]) => settingsStore.setExpandedAccountIds(accountIds),
    [],
  );
  const toggleAccountExpanded = useCallback(
    (accountId: string) => settingsStore.toggleAccountExpanded(accountId),
    [],
  );
  const setDefaultAccountsExpanded = useCallback(
    (expanded: boolean) => settingsStore.setDefaultAccountsExpanded(expanded),
    [],
  );
  const toggleAccountsSectionCollapsed = useCallback(
    () => settingsStore.toggleAccountsSectionCollapsed(),
    [],
  );
  const toggleTagsSectionCollapsed = useCallback(
    () => settingsStore.toggleTagsSectionCollapsed(),
    [],
  );
  const setEnableSystemTray = useCallback(
    (enabled: boolean) => settingsStore.setEnableSystemTray(enabled),
    [],
  );
  const setSystemTrayRestartNeeded = useCallback(
    (needed: boolean) => settingsStore.setSystemTrayRestartNeeded(needed),
    [],
  );
  const setSystemTrayAppliedValue = useCallback(
    (value: boolean) => settingsStore.setSystemTrayAppliedValue(value),
    [],
  );
  const setCheckForUpdatesAutomatically = useCallback(
    (enabled: boolean) => settingsStore.setCheckForUpdatesAutomatically(enabled),
    [],
  );
  const exportSettings = useCallback(() => settingsStore.exportSettings(), []);
  const importSettings = useCallback((json: string) => settingsStore.importSettings(json), []);

  const value: SettingsStore = {
    ...currentState,
    setTheme,
    setSidebarCollapsed,
    setSidebarWidth,
    toggleSidebarCollapsed,
    setAccentColor,
    setAutoSync,
    setSyncInterval,
    setSyncOnStartup,
    setShowCompletedByDefault,
    setConfirmBeforeDelete,
    setConfirmBeforeDeleteCalendar,
    setConfirmBeforeDeleteAccount,
    setConfirmBeforeDeleteTag,
    setDeleteSubtasksWithParent,
    setStartOfWeek,
    setNotifications,
    setDefaultCalendarId,
    setKeyboardShortcuts,
    updateShortcut,
    resetShortcuts,
    setDefaultPriority,
    setDefaultTags,
    setOnboardingCompleted,
    setExpandedAccountIds,
    toggleAccountExpanded,
    setDefaultAccountsExpanded,
    toggleAccountsSectionCollapsed,
    toggleTagsSectionCollapsed,
    setEnableSystemTray,
    setSystemTrayRestartNeeded,
    setSystemTrayAppliedValue,
    setCheckForUpdatesAutomatically,
    exportSettings,
    importSettings,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsStore(): SettingsStore {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsStore must be used within a SettingsProvider');
  }
  return context;
}
