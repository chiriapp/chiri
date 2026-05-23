import { createContext } from 'react';
import { DEFAULT_SHORTCUTS } from '$constants';
import { getColorSchemeFlavor } from '$constants/colorSchemes';
import { loggers } from '$lib/logger';
import type {
  DateFormat,
  DefaultDateOffset,
  DefaultReminderOffset,
  KeyboardShortcut,
  Priority,
  StartOfWeek,
  SubtaskDeletionBehavior,
  TaskStatus,
  TimeFormat,
} from '$types';
import type { AccentColor, Theme } from '$types/color';
import { DEFAULT_COLOR_SCHEME_ID } from '$types/color';
import type {
  EditorFieldKey,
  EditorFieldVisibility,
  QuickTimePresets,
  SettingsState,
  SettingsStore,
  TaskBadgeKey,
  TaskBadgeVisibility,
  TaskListDensity,
  WindowDecorationsMode,
} from '$types/settings';
import {
  applyAccentColor,
  applyColorScheme,
  applySchemeAccentColor,
  applyTheme,
  resolveAccentColor,
  resolveEffectiveTheme,
} from '$utils/color';
import { defaultState } from './settingsDefaults';
import { exportSettings, importSettings, mergeOrder, mergeShortcuts } from './settingsImportExport';

const log = loggers.settings;

const STORAGE_KEY = 'chiri-settings';

const loadFromStorage = (): { state: SettingsState; migrated: boolean } => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const { confirmBeforeDelete: _confirmBeforeDelete, ...storedState } = parsed.state ?? {};
      const loadedState = { ...defaultState, ...storedState };

      // Migrate old number[] quickTimePresets to object format
      if (Array.isArray(loadedState.quickTimePresets)) {
        loadedState.quickTimePresets = defaultState.quickTimePresets;
      }

      loadedState.editorFieldVisibility = {
        ...defaultState.editorFieldVisibility,
        ...loadedState.editorFieldVisibility,
      };
      loadedState.taskBadgeVisibility = {
        ...defaultState.taskBadgeVisibility,
        ...loadedState.taskBadgeVisibility,
      };
      loadedState.editorFieldOrder = mergeOrder(
        loadedState.editorFieldOrder,
        defaultState.editorFieldOrder,
      );
      loadedState.taskBadgeOrder = mergeOrder(
        loadedState.taskBadgeOrder,
        defaultState.taskBadgeOrder,
      );

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

// Apply theme, color scheme, and accent color immediately on module load
applyTheme(state.theme);
const _initEffectiveMode = resolveEffectiveTheme(state.theme);
applyColorScheme(state.colorScheme, state.colorSchemeFlavor, _initEffectiveMode);
const _initFlavor = getColorSchemeFlavor(
  state.colorScheme,
  state.colorSchemeFlavor,
  _initEffectiveMode,
);
const _initAccent = resolveAccentColor(state.accentColor, _initFlavor.accentColors);
if (state.colorScheme === DEFAULT_COLOR_SCHEME_ID) {
  applyAccentColor(_initAccent);
} else {
  applySchemeAccentColor(_initAccent);
}

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
  setTaskEditorWidth: (taskEditorWidth: number) => setState({ taskEditorWidth }),
  toggleSidebarCollapsed: () => setState({ sidebarCollapsed: !state.sidebarCollapsed }),
  setAccentColor: (accentColor: AccentColor) =>
    setState({
      accentColor,
      accentColorByScheme: { ...state.accentColorByScheme, [state.colorScheme]: accentColor },
    }),
  setAutoSync: (autoSync: boolean) => setState({ autoSync }),
  setSyncInterval: (syncInterval: number) => setState({ syncInterval }),
  setSyncOnStartup: (syncOnStartup: boolean) => setState({ syncOnStartup }),
  setSyncOnReconnect: (syncOnReconnect: boolean) => setState({ syncOnReconnect }),
  setShowCompletedByDefault: (showCompletedByDefault: boolean) =>
    setState({ showCompletedByDefault }),
  setConfirmBeforeDeletion: (confirmBeforeDeletion: boolean) => setState({ confirmBeforeDeletion }),
  setConfirmBeforePermanentDelete: (confirmBeforePermanentDelete: boolean) =>
    setState({ confirmBeforePermanentDelete }),
  setConfirmBeforeDeleteCalendar: (confirmBeforeDeleteCalendar: boolean) =>
    setState({ confirmBeforeDeleteCalendar }),
  setConfirmBeforeDeleteAccount: (confirmBeforeDeleteAccount: boolean) =>
    setState({ confirmBeforeDeleteAccount }),
  setConfirmBeforeDeleteTag: (confirmBeforeDeleteTag: boolean) =>
    setState({ confirmBeforeDeleteTag }),
  setDeleteSubtasksWithParent: (deleteSubtasksWithParent: SubtaskDeletionBehavior) =>
    setState({ deleteSubtasksWithParent }),
  setStartOfWeek: (startOfWeek: StartOfWeek) => setState({ startOfWeek }),
  setTimeFormat: (timeFormat: TimeFormat) => setState({ timeFormat }),
  setDateFormat: (dateFormat: DateFormat) => setState({ dateFormat }),
  setNotifications: (notifications: boolean) => setState({ notifications }),
  setNotifyReminders: (notifyReminders: boolean) => setState({ notifyReminders }),
  setNotifyOverdue: (notifyOverdue: boolean) => setState({ notifyOverdue }),
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

    return false;
  },
  setDefaultPriority: (defaultPriority: Priority) => setState({ defaultPriority }),
  setDefaultStatus: (defaultStatus: TaskStatus) => setState({ defaultStatus }),
  setDefaultPercentComplete: (defaultPercentComplete: number) =>
    setState({ defaultPercentComplete }),
  setDefaultTags: (defaultTags: string[]) => setState({ defaultTags }),
  setDefaultStartDate: (defaultStartDate: DefaultDateOffset) => setState({ defaultStartDate }),
  setDefaultDueDate: (defaultDueDate: DefaultDateOffset) => setState({ defaultDueDate }),
  setDefaultReminders: (defaultReminders: DefaultReminderOffset[]) =>
    setState({ defaultReminders }),
  setDefaultRrule: (defaultRrule: string | undefined) => setState({ defaultRrule }),
  setDefaultRepeatFrom: (defaultRepeatFrom: number) => setState({ defaultRepeatFrom }),
  setOnboardingCompleted: (onboardingCompleted: boolean) => setState({ onboardingCompleted }),
  setExpandedAccountIds: (expandedAccountIds: string[]) => setState({ expandedAccountIds }),
  toggleAccountExpanded: (accountId: string) => {
    const current = state.expandedAccountIds;
    if (current.includes(accountId)) {
      setState({
        expandedAccountIds: current.filter((id) => id !== accountId),
      });
    } else {
      setState({ expandedAccountIds: [...current, accountId] });
    }
  },
  setDefaultAccountsExpanded: (defaultAccountsExpanded: boolean) =>
    setState({ defaultAccountsExpanded }),
  toggleLocalSectionCollapsed: () =>
    setState({ localSectionCollapsed: !state.localSectionCollapsed }),
  toggleAccountsSectionCollapsed: () =>
    setState({ accountsSectionCollapsed: !state.accountsSectionCollapsed }),
  toggleFiltersSectionCollapsed: () =>
    setState({ filtersSectionCollapsed: !state.filtersSectionCollapsed }),
  toggleTagsSectionCollapsed: () => setState({ tagsSectionCollapsed: !state.tagsSectionCollapsed }),
  setEnableSystemTray: (enableSystemTray: boolean) => setState({ enableSystemTray }),
  setSystemTrayAppliedValue: (systemTrayAppliedValue: boolean) =>
    setState({ systemTrayAppliedValue }),
  setShowWindowOnLoginLaunch: (showWindowOnLoginLaunch: boolean) =>
    setState({ showWindowOnLoginLaunch }),
  setCheckForUpdatesAutomatically: (checkForUpdatesAutomatically: boolean) =>
    setState({ checkForUpdatesAutomatically }),
  setConfirmBeforeQuit: (confirmBeforeQuit: boolean) => setState({ confirmBeforeQuit }),
  setConfirmBeforeQuitAppliedValue: (confirmBeforeQuitAppliedValue: boolean) =>
    setState({ confirmBeforeQuitAppliedValue }),
  setDefaultAllDayReminderHour: (defaultAllDayReminderHour: number) =>
    setState({ defaultAllDayReminderHour }),
  setAllDayReminderNotificationsEnabled: (allDayReminderNotificationsEnabled: boolean) =>
    setState({ allDayReminderNotificationsEnabled }),
  setColorScheme: (
    colorScheme: string,
    colorSchemeFlavor: string | null,
    fallbackAccent?: string,
  ) => {
    // Save the current scheme's accent before switching
    const savedAccents = { ...state.accentColorByScheme, [state.colorScheme]: state.accentColor };
    // Restore the target scheme's saved accent, or use the provided fallback
    const restoredAccent = savedAccents[colorScheme] ?? fallbackAccent;
    setState({
      colorScheme,
      colorSchemeFlavor,
      accentColorByScheme: savedAccents,
      ...(restoredAccent !== undefined ? { accentColor: restoredAccent } : {}),
    });
  },
  setColorSchemeFlavor: (colorSchemeFlavor: string | null) => setState({ colorSchemeFlavor }),
  setUseAccentColorForCheckboxes: (useAccentColorForCheckboxes: boolean) =>
    setState({ useAccentColorForCheckboxes }),
  setTaskListDensity: (taskListDensity: TaskListDensity) => setState({ taskListDensity }),
  setDefaultTagColor: (defaultTagColor: string) => setState({ defaultTagColor }),
  setDefaultCalendarColor: (defaultCalendarColor: string) => setState({ defaultCalendarColor }),
  setQuietHoursEnabled: (quietHoursEnabled: boolean) => setState({ quietHoursEnabled }),
  setQuietHoursStart: (quietHoursStart: number) => setState({ quietHoursStart }),
  setQuietHoursEnd: (quietHoursEnd: number) => setState({ quietHoursEnd }),
  setEditorFieldVisibility: (editorFieldVisibility: EditorFieldVisibility) =>
    setState({ editorFieldVisibility }),
  setEditorFieldOrder: (editorFieldOrder: EditorFieldKey[]) => setState({ editorFieldOrder }),
  setTaskBadgeVisibility: (taskBadgeVisibility: TaskBadgeVisibility) =>
    setState({ taskBadgeVisibility }),
  setTaskBadgeOrder: (taskBadgeOrder: TaskBadgeKey[]) => setState({ taskBadgeOrder }),
  setQuickTimePresets: (quickTimePresets: QuickTimePresets) => setState({ quickTimePresets }),
  setConnectivityCheckEnabled: (connectivityCheckEnabled: boolean) =>
    setState({ connectivityCheckEnabled }),
  setConnectivityCheckUrl: (connectivityCheckUrl: string) => setState({ connectivityCheckUrl }),
  setConnectivityCheckInterval: (connectivityCheckInterval: number) =>
    setState({ connectivityCheckInterval }),
  setWindowDecorationsMode: (windowDecorationsMode: WindowDecorationsMode) =>
    setState({ windowDecorationsMode }),
  setWindowDecorationsAppliedValue: (windowDecorationsAppliedValue: WindowDecorationsMode) =>
    setState({ windowDecorationsAppliedValue }),
  setEnablePush: (enablePush: boolean) => setState({ enablePush }),
  setNtfyServerUrl: (ntfyServerUrl: string) => setState({ ntfyServerUrl }),
  setHasSeenRecentlyDeletedToast: (hasSeenRecentlyDeletedToast: boolean) =>
    setState({ hasSeenRecentlyDeletedToast }),

  exportSettings: () => exportSettings(state),

  importSettings: (json: string) => {
    const result = importSettings(json, defaultState);
    if (!result) return false;
    setState(result);
    return true;
  },

  resetSettings: () => {
    setState(defaultState);
  },
};

// Context for React components
export const SettingsContext = createContext<SettingsStore | null>(null);
