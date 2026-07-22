import type {
  DefaultDateOffset,
  DefaultReminderOffset,
  KeyboardShortcut,
  Priority,
  ServerType,
  TaskStatus,
} from '$types';
import type { AccentColor, Theme } from '$types/color';
import type { DateFormat, StartOfWeek, TimeFormat, WorkingDay } from '$types/preference';
import type { PushProviderId } from '$types/push';

export type SubtaskDeletionBehavior = 'delete' | 'keep';

export type SettingsCategory = 'app' | 'tasks' | 'accounts' | 'misc';
export type SettingsSubtab =
  | 'appearance'
  | 'navigation'
  | 'safety'
  | 'defaults'
  | 'scheduling'
  | 'list-layout'
  | 'editor'
  | 'notifications'
  | 'region-and-time'
  | 'keyboard-shortcuts'
  | 'startup-window'
  | 'connections'
  | 'data-diagnostics'
  | 'sync'
  | 'push'
  | 'network'
  | 'updates'
  | 'about';

export type TaskListDensity = 'compact' | 'normal' | 'comfortable';
export type WindowDecorationStyle = 'integrated' | 'native';
export type DefaultLaunchView = 'last-view' | 'all-tasks' | 'recently-deleted';
export type SidebarSectionKey = 'filters' | 'local' | 'accounts' | 'tags';
export type NetworkProxyMode = 'system' | 'none' | 'http' | 'socks';

export interface EditorFieldVisibility {
  status: boolean;
  description: boolean;
  url: boolean;
  dates: boolean;
  repeat: boolean;
  priority: boolean;
  calendar: boolean;
  tags: boolean;
  reminders: boolean;
  subtasks: boolean;
}

export type EditorFieldKey = keyof EditorFieldVisibility;

export type NotificationActionKey = 'complete' | 'snooze';

export type SnoozeDurationUnit = 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks';

export interface SnoozeDuration {
  id: string;
  value: number;
  unit: SnoozeDurationUnit;
}

export interface NotificationActionSettings {
  complete: boolean;
  snooze: boolean;
  snoozeDurations: SnoozeDuration[];
  order: NotificationActionKey[];
}

export interface TaskBadgeVisibility {
  startDate: boolean;
  dueDate: boolean;
  tags: boolean;
  calendar: boolean;
  url: boolean;
  status: boolean;
  snooze: boolean;
  repeat: boolean;
  subtasks: boolean;
}

export type TaskBadgeKey = keyof TaskBadgeVisibility;

export interface QuickTimePresets {
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
}

export interface ServerTypeOption {
  value: ServerType;
  label: string;
}

export interface ServerTypeGroup {
  label: string;
  options: ServerTypeOption[];
}

export interface SettingsState {
  theme: Theme;
  accentColor: AccentColor;
  autoSync: boolean;
  syncInterval: number;
  syncOnStartup: boolean;
  syncOnReconnect: boolean;
  confirmBeforeMoveToRecentlyDeleted: boolean;
  deleteSubtasksWithParent: SubtaskDeletionBehavior;
  autoEmptyRecentlyDeleted: boolean;
  recentlyDeletedRetentionDays: number;
  startOfWeek: StartOfWeek;
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
  notificationActions: NotificationActionSettings;
  notifications: boolean;
  notifyReminders: boolean;
  notifyOverdue: boolean;
  showAppIconBadge: boolean;
  defaultCalendarId: string | null;
  defaultCalendarIdManuallyChanged: boolean;
  preferCalDAVCalendarForNewTasks: boolean;
  keyboardShortcuts: KeyboardShortcut[];
  enableSystemTray: boolean;
  checkForUpdatesAutomatically: boolean;
  defaultPriority: Priority;
  defaultStatus: TaskStatus;
  defaultPercentComplete: number;
  defaultTags: string[];
  defaultStartDate: DefaultDateOffset;
  defaultStartTime: number | null;
  defaultDueDate: DefaultDateOffset;
  defaultDueTime: number | null;
  defaultReminders: DefaultReminderOffset[];
  defaultRrule: string | undefined;
  defaultRepeatFrom: number;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  taskEditorWidth: number;
  onboardingCompleted: boolean;
  expandedAccountIds: string[];
  localSectionCollapsed: boolean;
  accountsSectionCollapsed: boolean;
  filtersSectionCollapsed: boolean;
  tagsSectionCollapsed: boolean;
  showLocalSection: boolean;
  showAccountsSection: boolean;
  showFiltersSection: boolean;
  showTagsSection: boolean;
  showSidebarTaskCounts: boolean;
  sidebarSectionOrder: SidebarSectionKey[];
  defaultLaunchView: DefaultLaunchView;
  systemTrayAppliedValue: boolean;
  hideDockIconWhenWindowClosed: boolean;
  showWindowOnNormalLaunch: boolean;
  showWindowOnLoginLaunch: boolean;
  enableSystemTrayExplicitlySet: boolean;
  windowDecorationStyle: WindowDecorationStyle;
  confirmBeforeQuit: boolean;
  confirmBeforeQuitAppliedValue: boolean;
  defaultAllDayReminderHour: number;
  allDayReminderNotificationsEnabled: boolean;
  colorScheme: string;
  colorSchemeFlavor: string | null;
  /** remembers the chosen accent per scheme so switching back restores it */
  accentColorByScheme: Record<string, string>;
  useAccentColorForCheckboxes: boolean;
  showCursorPointers: boolean;
  taskListDensity: TaskListDensity;
  defaultTagColor: string;
  defaultCalendarColor: string;
  quietHoursEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
  editorFieldVisibility: EditorFieldVisibility;
  editorFieldOrder: EditorFieldKey[];
  taskBadgeVisibility: TaskBadgeVisibility;
  taskBadgeOrder: TaskBadgeKey[];
  quickTimePresets: QuickTimePresets;
  workingDays: WorkingDay[];
  connectivityCheckEnabled: boolean;
  connectivityCheckUrl: string;
  connectivityCheckInterval: number;
  connectivityRequestTimeout: number;
  networkProxyMode: NetworkProxyMode;
  networkProxyHost: string;
  networkProxyPort: string;
  enablePush: boolean;
  enforceVapid: boolean;
  pushProvider: PushProviderId;
  ntfyServerUrl: string;
  mozillaAutopushWebsocketUrl: string;
  mozillaAutopushEndpointUrl: string;
  hasSeenRecentlyDeletedToast: boolean;
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
  setConfirmBeforeMoveToRecentlyDeleted: (confirm: boolean) => void;
  setDeleteSubtasksWithParent: (behavior: SubtaskDeletionBehavior) => void;
  setAutoEmptyRecentlyDeleted: (enabled: boolean) => void;
  setRecentlyDeletedRetentionDays: (days: number) => void;
  setStartOfWeek: (day: StartOfWeek) => void;
  setTimeFormat: (format: TimeFormat) => void;
  setDateFormat: (format: DateFormat) => void;
  setNotificationActions: (notificationActions: NotificationActionSettings) => void;
  setNotifications: (enabled: boolean) => void;
  setNotifyReminders: (enabled: boolean) => void;
  setNotifyOverdue: (enabled: boolean) => void;
  setShowAppIconBadge: (enabled: boolean) => void;
  setDefaultCalendarId: (calendarId: string | null) => void;
  setDefaultCalendarIdAutomatically: (calendarId: string | null) => void;
  setPreferCalDAVCalendarForNewTasks: (enabled: boolean) => void;
  setKeyboardShortcuts: (shortcuts: KeyboardShortcut[]) => void;
  updateShortcut: (id: string, updates: Partial<KeyboardShortcut>) => void;
  resetShortcuts: () => void;
  ensureLatestShortcuts: () => void;
  setDefaultPriority: (priority: Priority) => void;
  setDefaultStatus: (status: TaskStatus) => void;
  setDefaultPercentComplete: (pct: number) => void;
  setDefaultTags: (tagIds: string[]) => void;
  setDefaultStartDate: (offset: DefaultDateOffset) => void;
  setDefaultStartTime: (time: number | null) => void;
  setDefaultDueDate: (offset: DefaultDateOffset) => void;
  setDefaultDueTime: (time: number | null) => void;
  setDefaultReminders: (reminders: DefaultReminderOffset[]) => void;
  setDefaultRrule: (rrule: string | undefined) => void;
  setDefaultRepeatFrom: (repeatFrom: number) => void;
  toggleSidebarCollapsed: () => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setExpandedAccountIds: (accountIds: string[]) => void;
  toggleAccountExpanded: (accountId: string) => void;
  toggleLocalSectionCollapsed: () => void;
  toggleAccountsSectionCollapsed: () => void;
  toggleFiltersSectionCollapsed: () => void;
  toggleTagsSectionCollapsed: () => void;
  setShowLocalSection: (show: boolean) => void;
  setShowAccountsSection: (show: boolean) => void;
  setShowFiltersSection: (show: boolean) => void;
  setShowTagsSection: (show: boolean) => void;
  setShowSidebarTaskCounts: (show: boolean) => void;
  setSidebarSectionOrder: (order: SidebarSectionKey[]) => void;
  setDefaultLaunchView: (view: DefaultLaunchView) => void;
  setEnableSystemTray: (enabled: boolean) => void;
  setEnableSystemTrayExplicitlySet: (explicitlySet: boolean) => void;
  setSystemTrayAppliedValue: (value: boolean) => void;
  setHideDockIconWhenWindowClosed: (enabled: boolean) => void;
  setShowWindowOnNormalLaunch: (show: boolean) => void;
  setShowWindowOnLoginLaunch: (show: boolean) => void;
  setWindowDecorationStyle: (style: WindowDecorationStyle) => void;
  setCheckForUpdatesAutomatically: (enabled: boolean) => void;
  setConfirmBeforeQuit: (confirm: boolean) => void;
  setConfirmBeforeQuitAppliedValue: (value: boolean) => void;
  setDefaultAllDayReminderHour: (hour: number) => void;
  setAllDayReminderNotificationsEnabled: (enabled: boolean) => void;
  /** switches scheme+flavor, saves the current accent, and restores the saved one (or fallbackAccent) */
  setColorScheme: (schemeId: string, flavorId: string | null, fallbackAccent?: string) => void;
  setColorSchemeFlavor: (flavorId: string | null) => void;
  setUseAccentColorForCheckboxes: (enabled: boolean) => void;
  setShowCursorPointers: (enabled: boolean) => void;
  setTaskListDensity: (density: TaskListDensity) => void;
  setDefaultTagColor: (color: string) => void;
  setDefaultCalendarColor: (color: string) => void;
  setQuietHoursEnabled: (enabled: boolean) => void;
  setQuietHoursStart: (hour: number) => void;
  setQuietHoursEnd: (hour: number) => void;
  setEditorFieldVisibility: (visibility: EditorFieldVisibility) => void;
  setEditorFieldOrder: (order: EditorFieldKey[]) => void;
  setTaskBadgeVisibility: (visibility: TaskBadgeVisibility) => void;
  setTaskBadgeOrder: (order: TaskBadgeKey[]) => void;
  setQuickTimePresets: (presets: QuickTimePresets) => void;
  setWorkingDays: (days: WorkingDay[]) => void;
  setConnectivityCheckEnabled: (enabled: boolean) => void;
  setConnectivityCheckUrl: (url: string) => void;
  setConnectivityCheckInterval: (interval: number) => void;
  setConnectivityRequestTimeout: (timeout: number) => void;
  setNetworkProxyMode: (mode: NetworkProxyMode) => void;
  setNetworkProxyHost: (host: string) => void;
  setNetworkProxyPort: (port: string) => void;
  setEnablePush: (enabled: boolean) => void;
  setEnforceVapid: (enabled: boolean) => void;
  setPushProvider: (provider: PushProviderId) => void;
  setNtfyServerUrl: (url: string) => void;
  setMozillaAutopushWebsocketUrl: (url: string) => void;
  setMozillaAutopushEndpointUrl: (url: string) => void;
  setHasSeenRecentlyDeletedToast: (seen: boolean) => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
  resetSettings: () => void;
}

export type SettingsStore = SettingsState & SettingsActions;
