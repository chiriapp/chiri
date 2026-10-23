import { loggers } from '$lib/logger';
import { normalizePreferences } from '$lib/preferences/normalization';
import type { SettingsState } from '$types/settings/state';

const log = loggers.settings;

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
      'syncStatusProgress',
      'progressIncrement',
      'completeInProcessTasks',
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
      'enableSystemTrayExplicitlySet',
      'hideDockIconWhenWindowClosed',
      'showWindowOnLoginLaunch',
      'windowDecorationStyle',
      'checkForUpdatesAutomatically',
      'confirmBeforeQuit',
      'confirmBeforeQuitAppliedValue',
      'defaultAllDayReminderHour',
      'allDayReminderNotificationsEnabled',
      'taskListDensity',
      'taskTitleLines',
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

    for (const key of [
      'keyboardShortcuts',
      'editorFieldVisibility',
      'notificationActions',
      'taskBadgeVisibility',
      'quickTimePresets',
    ] as const) {
      if (data[key] !== undefined) newState[key] = data[key];
    }

    return normalizePreferences(newState, defaultState).state;
  } catch (e) {
    log.error('Failed to import settings:', e);
    return null;
  }
};
