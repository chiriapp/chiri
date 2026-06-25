import { type ReactNode, useCallback, useSyncExternalStore } from 'react';
import { SettingsContext, settingsStore } from '$context/settingsContext';
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
  SettingsStore,
  SubtaskDeletionBehavior,
  TaskBadgeKey,
  TaskBadgeVisibility,
  TaskListDensity,
  WindowDecorationStyle,
} from '$types/settings';

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const currentState = useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getSnapshot,
    settingsStore.getSnapshot,
  );

  const setTheme = useCallback((theme: Theme) => settingsStore.setTheme(theme), []);
  const setSidebarCollapsed = useCallback(
    (collapsed: boolean) => settingsStore.setSidebarCollapsed(collapsed),
    [],
  );
  const setSidebarWidth = useCallback((width: number) => settingsStore.setSidebarWidth(width), []);
  const setTaskEditorWidth = useCallback(
    (width: number) => settingsStore.setTaskEditorWidth(width),
    [],
  );
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
  const setSyncOnReconnect = useCallback(
    (enabled: boolean) => settingsStore.setSyncOnReconnect(enabled),
    [],
  );
  const setConfirmBeforeDeletion = useCallback(
    (confirm: boolean) => settingsStore.setConfirmBeforeDeletion(confirm),
    [],
  );
  const setConfirmBeforePermanentDelete = useCallback(
    (confirm: boolean) => settingsStore.setConfirmBeforePermanentDelete(confirm),
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
  const setConfirmBeforeDeleteFilter = useCallback(
    (confirm: boolean) => settingsStore.setConfirmBeforeDeleteFilter(confirm),
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
  const setTimeFormat = useCallback(
    (format: TimeFormat) => settingsStore.setTimeFormat(format),
    [],
  );
  const setDateFormat = useCallback(
    (format: DateFormat) => settingsStore.setDateFormat(format),
    [],
  );
  const setNotifications = useCallback(
    (enabled: boolean) => settingsStore.setNotifications(enabled),
    [],
  );
  const setNotifyReminders = useCallback(
    (enabled: boolean) => settingsStore.setNotifyReminders(enabled),
    [],
  );
  const setNotifyOverdue = useCallback(
    (enabled: boolean) => settingsStore.setNotifyOverdue(enabled),
    [],
  );
  const setShowAppIconBadge = useCallback(
    (enabled: boolean) => settingsStore.setShowAppIconBadge(enabled),
    [],
  );
  const setDefaultCalendarId = useCallback(
    (calendarId: string | null) => settingsStore.setDefaultCalendarId(calendarId),
    [],
  );
  const setDefaultCalendarIdAutomatically = useCallback(
    (calendarId: string | null) => settingsStore.setDefaultCalendarIdAutomatically(calendarId),
    [],
  );
  const setPreferCalDAVCalendarForNewTasks = useCallback(
    (enabled: boolean) => settingsStore.setPreferCalDAVCalendarForNewTasks(enabled),
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
  const ensureLatestShortcuts = useCallback(() => settingsStore.ensureLatestShortcuts(), []);
  const setDefaultPriority = useCallback(
    (priority: Priority) => settingsStore.setDefaultPriority(priority),
    [],
  );
  const setDefaultStatus = useCallback(
    (status: TaskStatus) => settingsStore.setDefaultStatus(status),
    [],
  );
  const setDefaultPercentComplete = useCallback(
    (pct: number) => settingsStore.setDefaultPercentComplete(pct),
    [],
  );
  const setDefaultTags = useCallback(
    (tagIds: string[]) => settingsStore.setDefaultTags(tagIds),
    [],
  );
  const setDefaultStartDate = useCallback(
    (offset: DefaultDateOffset) => settingsStore.setDefaultStartDate(offset),
    [],
  );
  const setDefaultDueDate = useCallback(
    (offset: DefaultDateOffset) => settingsStore.setDefaultDueDate(offset),
    [],
  );
  const setDefaultReminders = useCallback(
    (reminders: DefaultReminderOffset[]) => settingsStore.setDefaultReminders(reminders),
    [],
  );
  const setDefaultRrule = useCallback(
    (rrule: string | undefined) => settingsStore.setDefaultRrule(rrule),
    [],
  );
  const setDefaultRepeatFrom = useCallback(
    (repeatFrom: number) => settingsStore.setDefaultRepeatFrom(repeatFrom),
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
  const toggleLocalSectionCollapsed = useCallback(
    () => settingsStore.toggleLocalSectionCollapsed(),
    [],
  );
  const toggleAccountsSectionCollapsed = useCallback(
    () => settingsStore.toggleAccountsSectionCollapsed(),
    [],
  );
  const toggleFiltersSectionCollapsed = useCallback(
    () => settingsStore.toggleFiltersSectionCollapsed(),
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
  const setSystemTrayAppliedValue = useCallback(
    (value: boolean) => settingsStore.setSystemTrayAppliedValue(value),
    [],
  );
  const setHideDockIconWhenWindowClosed = useCallback(
    (enabled: boolean) => settingsStore.setHideDockIconWhenWindowClosed(enabled),
    [],
  );
  const setShowWindowOnLoginLaunch = useCallback(
    (show: boolean) => settingsStore.setShowWindowOnLoginLaunch(show),
    [],
  );
  const setWindowDecorationStyle = useCallback(
    (style: WindowDecorationStyle) => settingsStore.setWindowDecorationStyle(style),
    [],
  );
  const setCheckForUpdatesAutomatically = useCallback(
    (enabled: boolean) => settingsStore.setCheckForUpdatesAutomatically(enabled),
    [],
  );
  const setConfirmBeforeQuit = useCallback(
    (confirm: boolean) => settingsStore.setConfirmBeforeQuit(confirm),
    [],
  );
  const setConfirmBeforeQuitAppliedValue = useCallback(
    (value: boolean) => settingsStore.setConfirmBeforeQuitAppliedValue(value),
    [],
  );
  const setDefaultAllDayReminderHour = useCallback(
    (hour: number) => settingsStore.setDefaultAllDayReminderHour(hour),
    [],
  );
  const setAllDayReminderNotificationsEnabled = useCallback(
    (enabled: boolean) => settingsStore.setAllDayReminderNotificationsEnabled(enabled),
    [],
  );
  const setColorScheme = useCallback(
    (schemeId: string, flavorId: string | null, fallbackAccent?: string) =>
      settingsStore.setColorScheme(schemeId, flavorId, fallbackAccent),
    [],
  );
  const setColorSchemeFlavor = useCallback(
    (flavorId: string | null) => settingsStore.setColorSchemeFlavor(flavorId),
    [],
  );
  const setUseAccentColorForCheckboxes = useCallback(
    (enabled: boolean) => settingsStore.setUseAccentColorForCheckboxes(enabled),
    [],
  );
  const setShowCursorPointers = useCallback(
    (enabled: boolean) => settingsStore.setShowCursorPointers(enabled),
    [],
  );
  const setTaskListDensity = useCallback(
    (density: TaskListDensity) => settingsStore.setTaskListDensity(density),
    [],
  );
  const setDefaultTagColor = useCallback(
    (color: string) => settingsStore.setDefaultTagColor(color),
    [],
  );
  const setDefaultCalendarColor = useCallback(
    (color: string) => settingsStore.setDefaultCalendarColor(color),
    [],
  );
  const setQuietHoursEnabled = useCallback(
    (enabled: boolean) => settingsStore.setQuietHoursEnabled(enabled),
    [],
  );
  const setQuietHoursStart = useCallback(
    (hour: number) => settingsStore.setQuietHoursStart(hour),
    [],
  );
  const setQuietHoursEnd = useCallback((hour: number) => settingsStore.setQuietHoursEnd(hour), []);
  const setEditorFieldVisibility = useCallback(
    (visibility: EditorFieldVisibility) => settingsStore.setEditorFieldVisibility(visibility),
    [],
  );
  const setEditorFieldOrder = useCallback(
    (order: EditorFieldKey[]) => settingsStore.setEditorFieldOrder(order),
    [],
  );
  const setTaskBadgeVisibility = useCallback(
    (visibility: TaskBadgeVisibility) => settingsStore.setTaskBadgeVisibility(visibility),
    [],
  );
  const setTaskBadgeOrder = useCallback(
    (order: TaskBadgeKey[]) => settingsStore.setTaskBadgeOrder(order),
    [],
  );
  const setQuickTimePresets = useCallback(
    (presets: QuickTimePresets) => settingsStore.setQuickTimePresets(presets),
    [],
  );
  const setConnectivityCheckEnabled = useCallback(
    (enabled: boolean) => settingsStore.setConnectivityCheckEnabled(enabled),
    [],
  );
  const setConnectivityCheckUrl = useCallback(
    (url: string) => settingsStore.setConnectivityCheckUrl(url),
    [],
  );
  const setConnectivityCheckInterval = useCallback(
    (interval: number) => settingsStore.setConnectivityCheckInterval(interval),
    [],
  );
  const setEnablePush = useCallback((enabled: boolean) => settingsStore.setEnablePush(enabled), []);
  const setPushProvider = useCallback(
    (provider: PushProviderId) => settingsStore.setPushProvider(provider),
    [],
  );
  const setNtfyServerUrl = useCallback((url: string) => settingsStore.setNtfyServerUrl(url), []);
  const setHasSeenRecentlyDeletedToast = useCallback(
    (seen: boolean) => settingsStore.setHasSeenRecentlyDeletedToast(seen),
    [],
  );
  const exportSettings = useCallback(() => settingsStore.exportSettings(), []);
  const importSettings = useCallback((json: string) => settingsStore.importSettings(json), []);
  const resetSettings = useCallback(() => settingsStore.resetSettings(), []);

  const value: SettingsStore = {
    ...currentState,
    setTheme,
    setSidebarCollapsed,
    setSidebarWidth,
    setTaskEditorWidth,
    toggleSidebarCollapsed,
    setAccentColor,
    setAutoSync,
    setSyncInterval,
    setSyncOnStartup,
    setSyncOnReconnect,
    setConfirmBeforeDeletion,
    setConfirmBeforePermanentDelete,
    setConfirmBeforeDeleteCalendar,
    setConfirmBeforeDeleteAccount,
    setConfirmBeforeDeleteFilter,
    setConfirmBeforeDeleteTag,
    setDeleteSubtasksWithParent,
    setStartOfWeek,
    setTimeFormat,
    setDateFormat,
    setNotifications,
    setNotifyReminders,
    setNotifyOverdue,
    setShowAppIconBadge,
    setDefaultCalendarId,
    setDefaultCalendarIdAutomatically,
    setPreferCalDAVCalendarForNewTasks,
    setKeyboardShortcuts,
    updateShortcut,
    resetShortcuts,
    ensureLatestShortcuts,
    setDefaultPriority,
    setDefaultStatus,
    setDefaultPercentComplete,
    setDefaultTags,
    setDefaultStartDate,
    setDefaultDueDate,
    setDefaultReminders,
    setDefaultRrule,
    setDefaultRepeatFrom,
    setOnboardingCompleted,
    setExpandedAccountIds,
    toggleAccountExpanded,
    setDefaultAccountsExpanded,
    toggleLocalSectionCollapsed,
    toggleAccountsSectionCollapsed,
    toggleFiltersSectionCollapsed,
    toggleTagsSectionCollapsed,
    setEnableSystemTray,
    setSystemTrayAppliedValue,
    setHideDockIconWhenWindowClosed,
    setShowWindowOnLoginLaunch,
    setWindowDecorationStyle,
    setCheckForUpdatesAutomatically,
    setConfirmBeforeQuit,
    setConfirmBeforeQuitAppliedValue,
    setDefaultAllDayReminderHour,
    setAllDayReminderNotificationsEnabled,
    setColorScheme,
    setColorSchemeFlavor,
    setUseAccentColorForCheckboxes,
    setShowCursorPointers,
    setTaskListDensity,
    setDefaultTagColor,
    setDefaultCalendarColor,
    setQuietHoursEnabled,
    setQuietHoursStart,
    setQuietHoursEnd,
    setEditorFieldVisibility,
    setEditorFieldOrder,
    setTaskBadgeVisibility,
    setTaskBadgeOrder,
    setQuickTimePresets,
    setConnectivityCheckEnabled,
    setConnectivityCheckUrl,
    setConnectivityCheckInterval,
    setEnablePush,
    setPushProvider,
    setNtfyServerUrl,
    setHasSeenRecentlyDeletedToast,
    exportSettings,
    importSettings,
    resetSettings,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
