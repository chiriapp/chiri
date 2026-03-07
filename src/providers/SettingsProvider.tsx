import { type ReactNode, useCallback, useSyncExternalStore } from 'react';
import { SettingsContext, type SettingsStore, settingsStore } from '$context/settingsContext';
import type {
  AccentColor,
  KeyboardShortcut,
  Priority,
  StartOfWeek,
  SubtaskDeletionBehavior,
  Theme,
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
  const ensureLatestShortcuts = useCallback(() => settingsStore.ensureLatestShortcuts(), []);
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
    setSyncOnReconnect,
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
    ensureLatestShortcuts,
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
};
