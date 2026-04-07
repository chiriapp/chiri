import { createContext } from 'react';
import {
  DEFAULT_COLOR,
  DEFAULT_DAY_OF_WEEK,
  DEFAULT_EDITOR_WIDTH,
  DEFAULT_SHORTCUTS,
  DEFAULT_SIDEBAR_WIDTH,
} from '$constants';
import { DEFAULT_COLOR_SCHEME_ID } from '$constants/colorSchemes';
import { loggers } from '$lib/logger';
import type {
  AccentColor,
  DateFormat,
  DefaultDateOffset,
  DefaultReminderOffset,
  KeyboardShortcut,
  Priority,
  StartOfWeek,
  SubtaskDeletionBehavior,
  TaskStatus,
  Theme,
  TimeFormat,
} from '$types';
import type {
  EditorFieldVisibility,
  QuickTimePresets,
  TaskBadgeVisibility,
  TaskListDensity,
} from '$types/settings';
import { applyAccentColor, applyColorScheme, applySchemeAccentColor, applyTheme } from '$utils/color';

const log = loggers.settings;

interface SettingsState {
  theme: Theme;
  accentColor: AccentColor;
  autoSync: boolean;
  syncInterval: number;
  syncOnStartup: boolean;
  syncOnReconnect: boolean;
  showCompletedByDefault: boolean;
  confirmBeforeDeletion: boolean;
  confirmBeforeDelete: boolean;
  confirmBeforeDeleteCalendar: boolean;
  confirmBeforeDeleteAccount: boolean;
  confirmBeforeDeleteTag: boolean;
  deleteSubtasksWithParent: SubtaskDeletionBehavior;
  startOfWeek: StartOfWeek;
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
  notifications: boolean;
  notifyReminders: boolean;
  notifyOverdue: boolean;
  defaultCalendarId: string | null;
  keyboardShortcuts: KeyboardShortcut[];
  enableSystemTray: boolean;
  checkForUpdatesAutomatically: boolean;
  defaultPriority: Priority;
  defaultStatus: TaskStatus;
  defaultPercentComplete: number;
  defaultTags: string[];
  defaultStartDate: DefaultDateOffset;
  defaultDueDate: DefaultDateOffset;
  defaultReminders: DefaultReminderOffset[];
  defaultRrule: string | undefined;
  defaultRepeatFrom: number;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  taskEditorWidth: number;
  onboardingCompleted: boolean;
  expandedAccountIds: string[];
  defaultAccountsExpanded: boolean;
  accountsSectionCollapsed: boolean;
  tagsSectionCollapsed: boolean;
  systemTrayRestartNeeded: boolean;
  systemTrayAppliedValue: boolean;
  confirmBeforeQuit: boolean;
  confirmBeforeQuitAppliedValue: boolean;
  defaultAllDayReminderHour: number;
  allDayReminderNotificationsEnabled: boolean;
  // Look & Feel
  colorScheme: string;
  colorSchemeFlavor: string | null;
  /** remembers the chosen accent per scheme so switching back restores it */
  accentColorByScheme: Record<string, string>;
  taskListDensity: TaskListDensity;
  defaultTagColor: string;
  defaultCalendarColor: string;
  // Notifications
  quietHoursEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
  // Editor
  editorFieldVisibility: EditorFieldVisibility;
  // Badges
  taskBadgeVisibility: TaskBadgeVisibility;
  // Date picker
  quickTimePresets: QuickTimePresets;
}

interface SettingsActions {
  setTheme: (theme: Theme) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setTaskEditorWidth: (width: number) => void;
  setAccentColor: (color: AccentColor) => void;
  setAutoSync: (enabled: boolean) => void;
  setSyncInterval: (interval: number) => void;
  setSyncOnStartup: (enabled: boolean) => void;
  setSyncOnReconnect: (enabled: boolean) => void;
  setShowCompletedByDefault: (show: boolean) => void;
  setConfirmBeforeDeletion: (confirm: boolean) => void;
  setConfirmBeforeDelete: (confirm: boolean) => void;
  setConfirmBeforeDeleteCalendar: (confirm: boolean) => void;
  setConfirmBeforeDeleteAccount: (confirm: boolean) => void;
  setConfirmBeforeDeleteTag: (confirm: boolean) => void;
  setDeleteSubtasksWithParent: (behavior: SubtaskDeletionBehavior) => void;
  setStartOfWeek: (day: StartOfWeek) => void;
  setTimeFormat: (format: TimeFormat) => void;
  setDateFormat: (format: DateFormat) => void;
  setNotifications: (enabled: boolean) => void;
  setNotifyReminders: (enabled: boolean) => void;
  setNotifyOverdue: (enabled: boolean) => void;
  setDefaultCalendarId: (calendarId: string | null) => void;
  setKeyboardShortcuts: (shortcuts: KeyboardShortcut[]) => void;
  updateShortcut: (id: string, updates: Partial<KeyboardShortcut>) => void;
  resetShortcuts: () => void;
  ensureLatestShortcuts: () => void;
  setDefaultPriority: (priority: Priority) => void;
  setDefaultStatus: (status: TaskStatus) => void;
  setDefaultPercentComplete: (pct: number) => void;
  setDefaultTags: (tagIds: string[]) => void;
  setDefaultStartDate: (offset: DefaultDateOffset) => void;
  setDefaultDueDate: (offset: DefaultDateOffset) => void;
  setDefaultReminders: (reminders: DefaultReminderOffset[]) => void;
  setDefaultRrule: (rrule: string | undefined) => void;
  setDefaultRepeatFrom: (repeatFrom: number) => void;
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
  setConfirmBeforeQuit: (confirm: boolean) => void;
  setConfirmBeforeQuitAppliedValue: (value: boolean) => void;
  setDefaultAllDayReminderHour: (hour: number) => void;
  setAllDayReminderNotificationsEnabled: (enabled: boolean) => void;
  /** switches scheme+flavor, saves the current accent, and restores the saved one (or fallbackAccent) */
  setColorScheme: (schemeId: string, flavorId: string | null, fallbackAccent?: string) => void;
  setColorSchemeFlavor: (flavorId: string | null) => void;
  setTaskListDensity: (density: TaskListDensity) => void;
  setDefaultTagColor: (color: string) => void;
  setDefaultCalendarColor: (color: string) => void;
  setQuietHoursEnabled: (enabled: boolean) => void;
  setQuietHoursStart: (hour: number) => void;
  setQuietHoursEnd: (hour: number) => void;
  setEditorFieldVisibility: (visibility: EditorFieldVisibility) => void;
  setTaskBadgeVisibility: (visibility: TaskBadgeVisibility) => void;
  setQuickTimePresets: (presets: QuickTimePresets) => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
  resetSettings: () => void;
}

export type SettingsStore = SettingsState & SettingsActions;

const STORAGE_KEY = 'chiri-settings';

// Detect locale preferences for intelligent defaults
const defaultState: SettingsState = {
  theme: 'system',
  accentColor: DEFAULT_COLOR,
  autoSync: true,
  syncInterval: 5,
  syncOnStartup: true,
  syncOnReconnect: true,
  showCompletedByDefault: true,
  confirmBeforeDeletion: true,
  confirmBeforeDelete: true,
  confirmBeforeDeleteCalendar: true,
  confirmBeforeDeleteAccount: true,
  confirmBeforeDeleteTag: true,
  deleteSubtasksWithParent: 'delete',
  startOfWeek: DEFAULT_DAY_OF_WEEK,
  timeFormat: '12',
  dateFormat: 'MMM d, yyyy',
  notifications: true,
  notifyReminders: true,
  notifyOverdue: true,
  defaultCalendarId: null,
  keyboardShortcuts: DEFAULT_SHORTCUTS,
  defaultPriority: 'none',
  defaultStatus: 'needs-action',
  defaultPercentComplete: 0,
  defaultTags: [],
  defaultStartDate: 'none',
  defaultDueDate: 'none',
  defaultReminders: [],
  defaultRrule: undefined,
  defaultRepeatFrom: 0,
  sidebarCollapsed: false,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  taskEditorWidth: DEFAULT_EDITOR_WIDTH,
  onboardingCompleted: false,
  expandedAccountIds: [],
  defaultAccountsExpanded: true,
  accountsSectionCollapsed: false,
  tagsSectionCollapsed: false,
  enableSystemTray: true,
  systemTrayRestartNeeded: false,
  systemTrayAppliedValue: true,
  checkForUpdatesAutomatically: true,
  confirmBeforeQuit: true,
  confirmBeforeQuitAppliedValue: true,
  defaultAllDayReminderHour: 17,
  allDayReminderNotificationsEnabled: true,
  colorScheme: DEFAULT_COLOR_SCHEME_ID,
  colorSchemeFlavor: null,
  accentColorByScheme: { [DEFAULT_COLOR_SCHEME_ID]: DEFAULT_COLOR },
  taskListDensity: 'comfortable',
  defaultTagColor: 'accent',
  defaultCalendarColor: 'accent',
  quietHoursEnabled: false,
  quietHoursStart: 22,
  quietHoursEnd: 8,
  editorFieldVisibility: {
    status: true,
    description: true,
    url: true,
    dates: true,
    priority: true,
    calendar: true,
    tags: true,
    reminders: true,
    subtasks: true,
  },
  taskBadgeVisibility: {
    startDate: true,
    dueDate: true,
    tags: true,
    calendar: true,
    url: true,
    status: true,
    repeat: true,
    subtasks: true,
  },
  // 9:00, 12:00, 17:00, 21:00 (minutes from midnight)
  quickTimePresets: { morning: 540, afternoon: 720, evening: 1020, night: 1260 },
};

/**
 * Merges new shortcuts from defaults into existing user shortcuts
 */
const mergeShortcuts = (
  existingShortcuts: KeyboardShortcut[],
  defaultShortcuts: KeyboardShortcut[],
) => {
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

      // Migrate old number[] quickTimePresets to object format
      if (Array.isArray(loadedState.quickTimePresets)) {
        loadedState.quickTimePresets = defaultState.quickTimePresets;
      }

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
applyColorScheme(state.colorScheme, state.colorSchemeFlavor);
if (state.colorScheme === DEFAULT_COLOR_SCHEME_ID) {
  applyAccentColor(state.accentColor);
} else {
  applySchemeAccentColor(state.accentColor);
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
  setConfirmBeforeQuit: (confirmBeforeQuit: boolean) => setState({ confirmBeforeQuit }),
  setConfirmBeforeQuitAppliedValue: (confirmBeforeQuitAppliedValue: boolean) =>
    setState({ confirmBeforeQuitAppliedValue }),
  setDefaultAllDayReminderHour: (defaultAllDayReminderHour: number) =>
    setState({ defaultAllDayReminderHour }),
  setAllDayReminderNotificationsEnabled: (allDayReminderNotificationsEnabled: boolean) =>
    setState({ allDayReminderNotificationsEnabled }),
  setColorScheme: (colorScheme: string, colorSchemeFlavor: string | null, fallbackAccent?: string) => {
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
  setTaskListDensity: (taskListDensity: TaskListDensity) => setState({ taskListDensity }),
  setDefaultTagColor: (defaultTagColor: string) => setState({ defaultTagColor }),
  setDefaultCalendarColor: (defaultCalendarColor: string) => setState({ defaultCalendarColor }),
  setQuietHoursEnabled: (quietHoursEnabled: boolean) => setState({ quietHoursEnabled }),
  setQuietHoursStart: (quietHoursStart: number) => setState({ quietHoursStart }),
  setQuietHoursEnd: (quietHoursEnd: number) => setState({ quietHoursEnd }),
  setEditorFieldVisibility: (editorFieldVisibility: EditorFieldVisibility) =>
    setState({ editorFieldVisibility }),
  setTaskBadgeVisibility: (taskBadgeVisibility: TaskBadgeVisibility) =>
    setState({ taskBadgeVisibility }),
  setQuickTimePresets: (quickTimePresets: QuickTimePresets) => setState({ quickTimePresets }),

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

      // Simple scalar/primitive settings
      const simpleSettings: Array<keyof SettingsState> = [
        'theme',
        'accentColor',
        'colorScheme',
        'colorSchemeFlavor',
        'accentColorByScheme',
        'autoSync',
        'syncInterval',
        'syncOnStartup',
        'syncOnReconnect',
        'showCompletedByDefault',
        'confirmBeforeDeletion',
        'confirmBeforeDelete',
        'confirmBeforeDeleteCalendar',
        'confirmBeforeDeleteAccount',
        'confirmBeforeDeleteTag',
        'deleteSubtasksWithParent',
        'startOfWeek',
        'timeFormat',
        'dateFormat',
        'notifications',
        'notifyReminders',
        'notifyOverdue',
        'defaultCalendarId',
        'defaultPriority',
        'defaultStatus',
        'defaultPercentComplete',
        'defaultTags',
        'defaultStartDate',
        'defaultDueDate',
        'defaultReminders',
        'defaultRrule',
        'defaultRepeatFrom',
        'sidebarCollapsed',
        'sidebarWidth',
        'taskEditorWidth',
        'onboardingCompleted',
        'expandedAccountIds',
        'defaultAccountsExpanded',
        'accountsSectionCollapsed',
        'tagsSectionCollapsed',
        'enableSystemTray',
        'systemTrayRestartNeeded',
        'systemTrayAppliedValue',
        'checkForUpdatesAutomatically',
        'confirmBeforeQuit',
        'confirmBeforeQuitAppliedValue',
        'defaultAllDayReminderHour',
        'allDayReminderNotificationsEnabled',
        'taskListDensity',
        'defaultTagColor',
        'defaultCalendarColor',
        'quietHoursEnabled',
        'quietHoursStart',
        'quietHoursEnd',
      ];

      // Build new state with simple settings
      const newState: Partial<SettingsState> = {};
      for (const key of simpleSettings) {
        newState[key] = data[key] ?? defaultState[key];
      }

      // Handle complex/merged settings separately
      newState.keyboardShortcuts = data.keyboardShortcuts
        ? mergeShortcuts(data.keyboardShortcuts, DEFAULT_SHORTCUTS)
        : defaultState.keyboardShortcuts;

      newState.editorFieldVisibility = data.editorFieldVisibility
        ? { ...defaultState.editorFieldVisibility, ...data.editorFieldVisibility }
        : defaultState.editorFieldVisibility;

      newState.taskBadgeVisibility = data.taskBadgeVisibility
        ? { ...defaultState.taskBadgeVisibility, ...data.taskBadgeVisibility }
        : defaultState.taskBadgeVisibility;

      newState.quickTimePresets =
        data.quickTimePresets && !Array.isArray(data.quickTimePresets)
          ? { ...defaultState.quickTimePresets, ...data.quickTimePresets }
          : defaultState.quickTimePresets;

      setState(newState as SettingsState);
      return true;
    } catch (e) {
      log.error('Failed to import settings:', e);
      return false;
    }
  },

  resetSettings: () => {
    setState(defaultState);
  },
};

// Context for React components
export const SettingsContext = createContext<SettingsStore | null>(null);
