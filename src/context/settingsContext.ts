import { createContext, useContext } from 'react';
import { DEFAULT_SHORTCUTS } from '$constants';
import { DEFAULT_COLOR_SCHEME_ID } from '$constants/colorSchemes';
import { loggers } from '$lib/logger';
import type {
  DefaultDateOffset,
  DefaultReminderOffset,
  KeyboardShortcut,
  Priority,
  TaskStatus,
} from '$types';
import type { AccentColor, Theme } from '$types/color';
import type { DateFormat, StartOfWeek, TimeFormat } from '$types/preference';
import type { PushProviderId } from '$types/push';
import type {
  EditorFieldKey,
  EditorFieldVisibility,
  QuickTimePresets,
  SettingsState,
  SettingsStore,
  SubtaskDeletionBehavior,
  TaskBadgeKey,
  TaskBadgeVisibility,
  TaskListDensity,
  WindowDecorationStyle,
} from '$types/settings';
import { applyAccentColor, applySchemeAccentColor, resolveAccentColor } from '$utils/color/accent';
import { applyColorScheme, getColorSchemeFlavor } from '$utils/color/scheme';
import { applyTheme, resolveEffectiveTheme } from '$utils/color/theme';
import { getShortcutSignature } from '$utils/keyboard';
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

      // migrate old number[] quickTimePresets to object format
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

      // merge keyboard shortcuts to include any new defaults
      let migrated = false;
      if (parsed.state?.keyboardShortcuts) {
        const originalLength = parsed.state.keyboardShortcuts.length;
        const originalIds = parsed.state.keyboardShortcuts.map((s: KeyboardShortcut) => s.id);

        loadedState.keyboardShortcuts = mergeShortcuts(
          parsed.state.keyboardShortcuts,
          DEFAULT_SHORTCUTS,
        );

        const newLength = loadedState.keyboardShortcuts.length;
        const originalShortcutsById = new Map(
          parsed.state.keyboardShortcuts.map((s: KeyboardShortcut) => [s.id, s]),
        );
        const newIds = loadedState.keyboardShortcuts
          .filter((s: KeyboardShortcut) => !originalIds.includes(s.id))
          .map((s: KeyboardShortcut) => s.id);
        const removedIds = originalIds.filter(
          (id: string) => !loadedState.keyboardShortcuts.find((s: KeyboardShortcut) => s.id === id),
        );

        // mark if shortcuts were added or deprecated shortcuts were removed during merge
        const changedIds = loadedState.keyboardShortcuts
          .filter((s: KeyboardShortcut) => {
            const original = originalShortcutsById.get(s.id);
            return original && getShortcutSignature(original) !== getShortcutSignature(s);
          })
          .map((s: KeyboardShortcut) => s.id);

        if (newLength !== originalLength || changedIds.length > 0) {
          migrated = true;
          log.info(
            `Migrated keyboard shortcuts: ${originalLength} → ${newLength} (added: ${newIds.join(', ') || 'none'}, removed: ${removedIds.join(', ') || 'none'}, changed: ${changedIds.join(', ') || 'none'})`,
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

// singleton store for accessing state outside React
const loadResult = loadFromStorage();
let state: SettingsState = loadResult.state;
let pendingMigrationSave = loadResult.migrated;

// apply theme, color scheme, and accent color immediately on module load
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

  // if migration happened during load and hasn't been saved yet,
  // save and notify all subscribers (including the new one)
  if (pendingMigrationSave && isFirstSubscriber) {
    saveToStorage(state);
    pendingMigrationSave = false; // Clear flag so we don't save again
    // notify all subscribers about the migrated state
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

// actions that can be called from anywhere
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
  setConfirmBeforeDeletion: (confirmBeforeDeletion: boolean) => setState({ confirmBeforeDeletion }),
  setConfirmBeforePermanentDelete: (confirmBeforePermanentDelete: boolean) =>
    setState({ confirmBeforePermanentDelete }),
  setConfirmBeforeDeleteCalendar: (confirmBeforeDeleteCalendar: boolean) =>
    setState({ confirmBeforeDeleteCalendar }),
  setConfirmBeforeDeleteAccount: (confirmBeforeDeleteAccount: boolean) =>
    setState({ confirmBeforeDeleteAccount }),
  setConfirmBeforeDeleteFilter: (confirmBeforeDeleteFilter: boolean) =>
    setState({ confirmBeforeDeleteFilter }),
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
  setShowAppIconBadge: (showAppIconBadge: boolean) => setState({ showAppIconBadge }),
  setDefaultCalendarId: (defaultCalendarId: string | null) =>
    setState({ defaultCalendarId, defaultCalendarIdManuallyChanged: true }),
  setDefaultCalendarIdAutomatically: (defaultCalendarId: string | null) =>
    setState({ defaultCalendarId }),
  setPreferCalDAVCalendarForNewTasks: (preferCalDAVCalendarForNewTasks: boolean) =>
    setState({ preferCalDAVCalendarForNewTasks }),
  setKeyboardShortcuts: (keyboardShortcuts: KeyboardShortcut[]) => setState({ keyboardShortcuts }),
  updateShortcut: (id: string, updates: Partial<KeyboardShortcut>) => {
    const shortcuts = state.keyboardShortcuts.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setState({ keyboardShortcuts: shortcuts });
  },
  resetShortcuts: () => {
    // use current DEFAULT_SHORTCUTS to ensure latest defaults are applied
    setState({ keyboardShortcuts: DEFAULT_SHORTCUTS });
  },
  ensureLatestShortcuts: () => {
    // force a check and merge of shortcuts with current defaults
    const merged = mergeShortcuts(state.keyboardShortcuts, DEFAULT_SHORTCUTS);
    const hasNewShortcuts = merged.some((m) => !state.keyboardShortcuts.find((s) => s.id === m.id));
    const hasDeprecatedShortcuts = state.keyboardShortcuts.some(
      (shortcut) => !merged.find((s) => s.id === shortcut.id),
    );
    const hasChangedShortcuts = merged.some((shortcut) => {
      const current = state.keyboardShortcuts.find((s) => s.id === shortcut.id);
      return current && getShortcutSignature(current) !== getShortcutSignature(shortcut);
    });

    if (hasNewShortcuts || hasDeprecatedShortcuts || hasChangedShortcuts) {
      const newCount = merged.length - state.keyboardShortcuts.length;
      log.info(`Updating shortcuts: ${newCount} shortcut delta (${merged.length} total)`);
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
  setHideDockIconWhenWindowClosed: (hideDockIconWhenWindowClosed: boolean) =>
    setState({ hideDockIconWhenWindowClosed }),
  setShowWindowOnLoginLaunch: (showWindowOnLoginLaunch: boolean) =>
    setState({ showWindowOnLoginLaunch }),
  setWindowDecorationStyle: (windowDecorationStyle: WindowDecorationStyle) =>
    setState({ windowDecorationStyle }),
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
    // save the current scheme's accent before switching
    const savedAccents = { ...state.accentColorByScheme, [state.colorScheme]: state.accentColor };
    // restore the target scheme's saved accent, or use the provided fallback
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
  setShowCursorPointers: (showCursorPointers: boolean) => setState({ showCursorPointers }),
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
  setEnablePush: (enablePush: boolean) => setState({ enablePush }),
  setPushProvider: (pushProvider: PushProviderId) => setState({ pushProvider }),
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

// context for React components
export const SettingsContext = createContext<SettingsStore | null>(null);

export const useSettingsStore = (): SettingsStore => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsStore must be used within a SettingsProvider');
  }
  return context;
};
