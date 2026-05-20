import { DEFAULT_SHORTCUTS } from '$constants';
import { loggers } from '$lib/logger';
import type { KeyboardShortcut } from '$types';
import type { SettingsState } from '$types/settings';

const log = loggers.settings;

export const mergeShortcuts = (
  existingShortcuts: KeyboardShortcut[],
  defaultShortcuts: KeyboardShortcut[],
) => {
  const existingMap = new Map(existingShortcuts.map((s) => [s.id, s]));

  return defaultShortcuts.map((defaultShortcut) => {
    const existing = existingMap.get(defaultShortcut.id);
    return existing || defaultShortcut;
  });
};

export const mergeOrder = <T extends string>(storedOrder: unknown, defaultOrder: T[]) => {
  if (!Array.isArray(storedOrder)) return defaultOrder;

  const validStoredOrder = storedOrder.filter((key): key is T => defaultOrder.includes(key as T));
  const missingKeys = defaultOrder.filter((key) => !validStoredOrder.includes(key));
  return [...validStoredOrder, ...missingKeys];
};

export const exportSettings = (state: SettingsState): string => {
  const exportData = {
    version: 1,
    ...state,
  };
  return JSON.stringify(exportData, null, 2);
};

export const importSettings = (
  json: string,
  defaultState: SettingsState,
): SettingsState | null => {
  try {
    const data = JSON.parse(json);
    if (data.version !== 1) {
      log.error('Unsupported settings version');
      return null;
    }

    const simpleSettings: Array<keyof SettingsState> = [
      'theme',
      'accentColor',
      'colorScheme',
      'colorSchemeFlavor',
      'accentColorByScheme',
      'useAccentColorForCheckboxes',
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
      'localSectionCollapsed',
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
      'editorFieldOrder',
      'taskBadgeOrder',
      'connectivityCheckEnabled',
      'connectivityCheckUrl',
      'connectivityCheckInterval',
      'windowDecorationsMode',
      'enablePush',
      'ntfyServerUrl',
    ];

    const newState: Partial<SettingsState> = {};
    for (const key of simpleSettings) {
      newState[key] = data[key] ?? defaultState[key];
    }

    newState.keyboardShortcuts = data.keyboardShortcuts
      ? mergeShortcuts(data.keyboardShortcuts, DEFAULT_SHORTCUTS)
      : defaultState.keyboardShortcuts;

    newState.editorFieldVisibility = data.editorFieldVisibility
      ? { ...defaultState.editorFieldVisibility, ...data.editorFieldVisibility }
      : defaultState.editorFieldVisibility;
    newState.editorFieldOrder = mergeOrder(data.editorFieldOrder, defaultState.editorFieldOrder);

    newState.taskBadgeVisibility = data.taskBadgeVisibility
      ? { ...defaultState.taskBadgeVisibility, ...data.taskBadgeVisibility }
      : defaultState.taskBadgeVisibility;
    newState.taskBadgeOrder = mergeOrder(data.taskBadgeOrder, defaultState.taskBadgeOrder);

    newState.quickTimePresets =
      data.quickTimePresets && !Array.isArray(data.quickTimePresets)
        ? { ...defaultState.quickTimePresets, ...data.quickTimePresets }
        : defaultState.quickTimePresets;

    return newState as SettingsState;
  } catch (e) {
    log.error('Failed to import settings:', e);
    return null;
  }
};
