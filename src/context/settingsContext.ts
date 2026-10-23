import { createContext, useContext } from 'react';
import { DEFAULT_SHORTCUTS } from '$constants';
import { DEFAULT_COLOR_SCHEME_ID } from '$constants/color';
import { loggers } from '$lib/logger';
import { mergeShortcuts } from '$lib/preferences/normalization';
import { preferencesPersistence } from '$lib/preferences/persistence';
import { exportSettings, importSettings } from '$lib/preferences/serialization';
import type { AccentColor, Theme } from '$types/color';
import type { NotificationActionSettings } from '$types/notifications/settings';
import type { PushProviderId } from '$types/push/providers';
import type { DefaultDateOffset, DefaultReminderOffset } from '$types/settings/categories/defaults';
import type {
  EditorFieldKey,
  EditorFieldVisibility,
  TaskBadgeKey,
  TaskBadgeVisibility,
} from '$types/settings/categories/editor';
import type { TaskListDensity, TaskTitleLines } from '$types/settings/categories/layout';
import type { DefaultLaunchView, SidebarSectionKey } from '$types/settings/categories/navigation';
import type { NetworkProxyMode } from '$types/settings/categories/network';
import type { DateFormat, StartOfWeek, TimeFormat } from '$types/settings/categories/region';
import type { SubtaskDeletionBehavior } from '$types/settings/categories/safety';
import type { QuickTimePresets, WorkingDay } from '$types/settings/categories/scheduling';
import type { ProgressIncrement } from '$types/settings/categories/statusProgress';
import type { WindowDecorationStyle } from '$types/settings/categories/system';
import type { SettingsState, SettingsStore } from '$types/settings/state';
import type { KeyboardShortcut } from '$types/shortcuts';
import type { Priority, Status } from '$types/task/model';
import { applyAccentColor, applySchemeAccentColor, resolveAccentColor } from '$utils/color/accent';
import { applyColorScheme, getColorSchemeFlavor } from '$utils/color/scheme';
import { applyTheme, resolveEffectiveTheme } from '$utils/color/theme';
import { getShortcutSignature } from '$utils/keyboard';
import { defaultState } from './settingsDefaults';

const log = loggers.settings;

// singleton store for accessing state outside React
let state: SettingsState = defaultState;
let initializationPromise: Promise<void> | null = null;

const applyInitialAppearance = () => {
  applyTheme(state.theme);
  const effectiveMode = resolveEffectiveTheme(state.theme);
  applyColorScheme(state.colorScheme, state.colorSchemeFlavor, effectiveMode);
  const flavor = getColorSchemeFlavor(state.colorScheme, state.colorSchemeFlavor, effectiveMode);
  const accent = resolveAccentColor(state.accentColor, flavor.accentColors);
  if (state.colorScheme === DEFAULT_COLOR_SCHEME_ID) {
    applyAccentColor(accent, effectiveMode);
  } else {
    applySchemeAccentColor(accent, effectiveMode);
  }
};

const listeners = new Set<() => void>();

const emitChange = () => {
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => {
  return state;
};

const setState = (partial: Partial<SettingsState>) => {
  state = { ...state, ...partial };
  preferencesPersistence.schedule(state);
  emitChange();
};

const initialize = () => {
  initializationPromise ??= preferencesPersistence.load(defaultState).then((result) => {
    state = result.state;
    const shortcutMigration = result.shortcutMigration;
    if (shortcutMigration) {
      log.info(
        `Migrated keyboard shortcuts: ${shortcutMigration.originalLength} → ${shortcutMigration.newLength} (added: ${shortcutMigration.newIds.join(', ') || 'none'}, removed: ${shortcutMigration.removedIds.join(', ') || 'none'}, changed: ${shortcutMigration.changedIds.join(', ') || 'none'})`,
      );
    }
    applyInitialAppearance();
    emitChange();
  });

  return initializationPromise;
};

// actions that can be called from anywhere
export const settingsStore = {
  initialize,
  flush: () => preferencesPersistence.flush(),
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
  setConfirmBeforeMoveToRecentlyDeleted: (confirmBeforeMoveToRecentlyDeleted: boolean) =>
    setState({ confirmBeforeMoveToRecentlyDeleted }),
  setDeleteSubtasksWithParent: (deleteSubtasksWithParent: SubtaskDeletionBehavior) =>
    setState({ deleteSubtasksWithParent }),
  setAutoEmptyRecentlyDeleted: (autoEmptyRecentlyDeleted: boolean) =>
    setState({ autoEmptyRecentlyDeleted }),
  setRecentlyDeletedRetentionDays: (recentlyDeletedRetentionDays: number) =>
    setState({ recentlyDeletedRetentionDays }),
  setStartOfWeek: (startOfWeek: StartOfWeek) => setState({ startOfWeek }),
  setTimeFormat: (timeFormat: TimeFormat) => setState({ timeFormat }),
  setDateFormat: (dateFormat: DateFormat) => setState({ dateFormat }),
  setNotifications: (notifications: boolean) => setState({ notifications }),
  setNotificationActions: (notificationActions: NotificationActionSettings) =>
    setState({ notificationActions }),

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
  setDefaultStatus: (defaultStatus: Status) => setState({ defaultStatus }),
  setDefaultPercentComplete: (defaultPercentComplete: number) =>
    setState({ defaultPercentComplete }),
  setSyncStatusProgress: (syncStatusProgress: boolean) => setState({ syncStatusProgress }),
  setProgressIncrement: (progressIncrement: ProgressIncrement) => setState({ progressIncrement }),
  setCompleteInProcessTasks: (completeInProcessTasks: boolean) =>
    setState({ completeInProcessTasks }),
  setDefaultTags: (defaultTags: string[]) => setState({ defaultTags }),
  setDefaultStartDate: (defaultStartDate: DefaultDateOffset) => setState({ defaultStartDate }),
  setDefaultStartTime: (defaultStartTime: number | null) => setState({ defaultStartTime }),
  setDefaultDueDate: (defaultDueDate: DefaultDateOffset) => setState({ defaultDueDate }),
  setDefaultDueTime: (defaultDueTime: number | null) => setState({ defaultDueTime }),
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
  toggleLocalSectionCollapsed: () =>
    setState({ localSectionCollapsed: !state.localSectionCollapsed }),
  toggleAccountsSectionCollapsed: () =>
    setState({ accountsSectionCollapsed: !state.accountsSectionCollapsed }),
  toggleFiltersSectionCollapsed: () =>
    setState({ filtersSectionCollapsed: !state.filtersSectionCollapsed }),
  toggleTagsSectionCollapsed: () => setState({ tagsSectionCollapsed: !state.tagsSectionCollapsed }),
  setShowLocalSection: (showLocalSection: boolean) => setState({ showLocalSection }),
  setShowAccountsSection: (showAccountsSection: boolean) => setState({ showAccountsSection }),
  setShowFiltersSection: (showFiltersSection: boolean) => setState({ showFiltersSection }),
  setShowTagsSection: (showTagsSection: boolean) => setState({ showTagsSection }),
  setShowSidebarTaskCounts: (showSidebarTaskCounts: boolean) => setState({ showSidebarTaskCounts }),
  setSidebarSectionOrder: (sidebarSectionOrder: SidebarSectionKey[]) =>
    setState({ sidebarSectionOrder }),
  setDefaultLaunchView: (defaultLaunchView: DefaultLaunchView) => setState({ defaultLaunchView }),
  setEnableSystemTray: (enableSystemTray: boolean) => setState({ enableSystemTray }),
  setSystemTrayAppliedValue: (systemTrayAppliedValue: boolean) =>
    setState({ systemTrayAppliedValue }),
  setHideDockIconWhenWindowClosed: (hideDockIconWhenWindowClosed: boolean) =>
    setState({ hideDockIconWhenWindowClosed }),
  setShowWindowOnLoginLaunch: (showWindowOnLoginLaunch: boolean) =>
    setState({ showWindowOnLoginLaunch }),
  setEnableSystemTrayExplicitlySet: (enableSystemTrayExplicitlySet: boolean) =>
    setState({ enableSystemTrayExplicitlySet }),
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
  setTaskTitleLines: (taskTitleLines: TaskTitleLines) => setState({ taskTitleLines }),
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
  setWorkingDays: (workingDays: WorkingDay[]) => setState({ workingDays }),
  setConnectivityCheckEnabled: (connectivityCheckEnabled: boolean) =>
    setState({ connectivityCheckEnabled }),
  setConnectivityCheckUrl: (connectivityCheckUrl: string) => setState({ connectivityCheckUrl }),
  setConnectivityCheckInterval: (connectivityCheckInterval: number) =>
    setState({ connectivityCheckInterval }),
  setConnectivityRequestTimeout: (connectivityRequestTimeout: number) =>
    setState({ connectivityRequestTimeout }),
  setNetworkProxyMode: (networkProxyMode: NetworkProxyMode) => setState({ networkProxyMode }),
  setNetworkProxyHost: (networkProxyHost: string) => setState({ networkProxyHost }),
  setNetworkProxyPort: (networkProxyPort: string) => setState({ networkProxyPort }),
  setEnablePush: (enablePush: boolean) => setState({ enablePush }),
  setEnforceVapid: (enforceVapid: boolean) => setState({ enforceVapid }),
  setPushProvider: (pushProvider: PushProviderId) => setState({ pushProvider }),
  setNtfyServerUrl: (ntfyServerUrl: string) => setState({ ntfyServerUrl }),
  setMozillaAutopushWebsocketUrl: (mozillaAutopushWebsocketUrl: string) =>
    setState({ mozillaAutopushWebsocketUrl }),
  setMozillaAutopushEndpointUrl: (mozillaAutopushEndpointUrl: string) =>
    setState({ mozillaAutopushEndpointUrl }),
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
