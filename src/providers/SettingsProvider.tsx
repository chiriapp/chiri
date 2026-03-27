import { type ReactNode, useCallback, useSyncExternalStore } from 'react';
import type { TaskListDensity } from '$context/settingsContext';
import {
  type EditorFieldVisibility,
  SettingsContext,
  type SettingsStore,
  settingsStore,
  type TaskBadgeVisibility,
} from '$context/settingsContext';
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
} from '$types/index';

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
  const setShowCompletedByDefault = useCallback(
    (show: boolean) => settingsStore.setShowCompletedByDefault(show),
    [],
  );
  const setConfirmBeforeDeletion = useCallback(
    (confirm: boolean) => settingsStore.setConfirmBeforeDeletion(confirm),
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
  const setEnableToasts = useCallback(
    (enabled: boolean) => settingsStore.setEnableToasts(enabled),
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
  const setTaskBadgeVisibility = useCallback(
    (visibility: TaskBadgeVisibility) => settingsStore.setTaskBadgeVisibility(visibility),
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
    setShowCompletedByDefault,
    setConfirmBeforeDeletion,
    setConfirmBeforeDelete,
    setConfirmBeforeDeleteCalendar,
    setConfirmBeforeDeleteAccount,
    setConfirmBeforeDeleteTag,
    setDeleteSubtasksWithParent,
    setStartOfWeek,
    setTimeFormat,
    setDateFormat,
    setNotifications,
    setNotifyReminders,
    setNotifyOverdue,
    setDefaultCalendarId,
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
    setEnableToasts,
    setConfirmBeforeQuit,
    setConfirmBeforeQuitAppliedValue,
    setDefaultAllDayReminderHour,
    setTaskListDensity,
    setDefaultTagColor,
    setDefaultCalendarColor,
    setQuietHoursEnabled,
    setQuietHoursStart,
    setQuietHoursEnd,
    setEditorFieldVisibility,
    setTaskBadgeVisibility,
    exportSettings,
    importSettings,
    resetSettings,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
