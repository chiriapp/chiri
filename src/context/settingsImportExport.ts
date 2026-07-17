import { DEFAULT_SHORTCUTS, MAX_NOTIFICATION_ACTIONS } from '$constants';
import { loggers } from '$lib/logger';
import type { KeyboardShortcut } from '$types';
import type { WorkingDay } from '$types/preference';
import type { NotificationActionSettings, SettingsState } from '$types/settings';

import { isReservedShortcut } from '$utils/keyboard';
import { normalizeProxyPort } from '$utils/misc';

const log = loggers.settings;

export const mergeShortcuts = (
  existingShortcuts: KeyboardShortcut[],
  defaultShortcuts: KeyboardShortcut[],
) => {
  const existingMap = new Map(existingShortcuts.map((s) => [s.id, s]));

  return defaultShortcuts.map((defaultShortcut) => {
    const existing = existingMap.get(defaultShortcut.id);
    if (existing && isReservedShortcut(existing)) {
      return defaultShortcut;
    }

    return existing || defaultShortcut;
  });
};

export const mergeOrder = <T extends string>(storedOrder: unknown, defaultOrder: T[]) => {
  if (!Array.isArray(storedOrder)) return defaultOrder;

  const validStoredOrder = storedOrder.filter((key): key is T => defaultOrder.includes(key as T));
  const missingKeys = defaultOrder.filter((key) => !validStoredOrder.includes(key));
  return [...validStoredOrder, ...missingKeys];
};

const isWorkingDay = (value: unknown): value is WorkingDay =>
  typeof value === 'string' && ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'].includes(value);

export const clampSnoozeDurations = (actions: NotificationActionSettings) => {
  const maxSnoozeDurations = actions.complete
    ? MAX_NOTIFICATION_ACTIONS - 1
    : MAX_NOTIFICATION_ACTIONS;
  return actions.snoozeDurations.slice(0, maxSnoozeDurations);
};

export const exportSettings = (state: SettingsState) => {
  const exportData = {
    version: 1,
    ...state,
  };
  return JSON.stringify(exportData, null, 2);
};

export const importSettings = (json: string, defaultState: SettingsState): SettingsState | null => {
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
      'showCursorPointers',
      'autoSync',
      'syncInterval',
      'syncOnStartup',
      'syncOnReconnect',
      'confirmBeforeMoveToRecentlyDeleted',
      'deleteSubtasksWithParent',
      'autoEmptyRecentlyDeleted',
      'recentlyDeletedRetentionDays',
      'startOfWeek',
      'timeFormat',
      'dateFormat',
      'notifications',
      'notifyReminders',
      'notifyOverdue',
      'showAppIconBadge',
      'defaultCalendarId',
      'defaultPriority',
      'defaultStatus',
      'defaultPercentComplete',
      'defaultTags',
      'defaultStartDate',
      'defaultStartTime',
      'defaultDueDate',
      'defaultDueTime',
      'defaultReminders',
      'defaultRrule',
      'defaultRepeatFrom',
      'sidebarCollapsed',
      'sidebarWidth',
      'taskEditorWidth',
      'onboardingCompleted',
      'expandedAccountIds',
      'localSectionCollapsed',
      'accountsSectionCollapsed',
      'filtersSectionCollapsed',
      'tagsSectionCollapsed',
      'showLocalSection',
      'showAccountsSection',
      'showFiltersSection',
      'showTagsSection',
      'showSidebarTaskCounts',
      'defaultLaunchView',
      'enableSystemTray',
      'systemTrayAppliedValue',
      'hideDockIconWhenWindowClosed',
      'showWindowOnNormalLaunch',
      'showWindowOnLoginLaunch',
      'restoreWindowState',
      'windowDecorationStyle',
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
      'workingDays',
      'connectivityCheckEnabled',
      'connectivityCheckUrl',
      'connectivityCheckInterval',
      'connectivityRequestTimeout',
      'networkProxyMode',
      'networkProxyHost',
      'networkProxyPort',
      'enablePush',
      'enforceVapid',
      'pushProvider',
      'ntfyServerUrl',
      'mozillaAutopushWebsocketUrl',
      'mozillaAutopushEndpointUrl',
      'hasSeenRecentlyDeletedToast',
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

    const notificationActions = data.notificationActions
      ? { ...defaultState.notificationActions, ...data.notificationActions }
      : defaultState.notificationActions;
    notificationActions.order = mergeOrder(
      notificationActions.order,
      defaultState.notificationActions.order,
    );
    notificationActions.snoozeDurations = clampSnoozeDurations(notificationActions);
    newState.notificationActions = notificationActions;
    newState.taskBadgeVisibility = data.taskBadgeVisibility
      ? { ...defaultState.taskBadgeVisibility, ...data.taskBadgeVisibility }
      : defaultState.taskBadgeVisibility;
    newState.taskBadgeOrder = mergeOrder(data.taskBadgeOrder, defaultState.taskBadgeOrder);

    newState.sidebarSectionOrder = mergeOrder(
      data.sidebarSectionOrder,
      defaultState.sidebarSectionOrder,
    );

    newState.workingDays = Array.isArray(data.workingDays)
      ? (data.workingDays.filter(isWorkingDay) as WorkingDay[])
      : defaultState.workingDays;

    newState.quickTimePresets =
      data.quickTimePresets && !Array.isArray(data.quickTimePresets)
        ? { ...defaultState.quickTimePresets, ...data.quickTimePresets }
        : defaultState.quickTimePresets;
    newState.networkProxyPort = normalizeProxyPort(newState.networkProxyPort);

    return newState as SettingsState;
  } catch (e) {
    log.error('Failed to import settings:', e);
    return null;
  }
};
