import type {
  DateFormat,
  DefaultDateOffset,
  DefaultReminderOffset,
  KeyboardShortcut,
  Priority,
  ServerType,
  StartOfWeek,
  SubtaskDeletionBehavior,
  TaskStatus,
  TimeFormat,
} from '$types';
import type { AccentColor, Theme } from '$types/color';

export type TaskListDensity = 'comfortable' | 'compact';

export type WindowDecorationsMode = 'auto' | 'on' | 'off';

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

export interface TaskBadgeVisibility {
  startDate: boolean;
  dueDate: boolean;
  tags: boolean;
  calendar: boolean;
  url: boolean;
  status: boolean;
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

export interface OnboardingStep {
  title: string;
  description: React.ReactNode;
  icon: React.ReactNode;
  illustration?: React.ReactNode;
}

export interface ServerTypeOption {
  value: ServerType;
  label: string;
  description: string;
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
  localSectionCollapsed: boolean;
  accountsSectionCollapsed: boolean;
  tagsSectionCollapsed: boolean;
  systemTrayRestartNeeded: boolean;
  systemTrayAppliedValue: boolean;
  confirmBeforeQuit: boolean;
  confirmBeforeQuitAppliedValue: boolean;
  defaultAllDayReminderHour: number;
  allDayReminderNotificationsEnabled: boolean;
  colorScheme: string;
  colorSchemeFlavor: string | null;
  /** remembers the chosen accent per scheme so switching back restores it */
  accentColorByScheme: Record<string, string>;
  useAccentColorForCheckboxes: boolean;
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
  connectivityCheckEnabled: boolean;
  connectivityCheckUrl: string;
  connectivityCheckInterval: number;
  windowDecorationsMode: WindowDecorationsMode;
  enablePush: boolean;
  ntfyServerUrl: string;
}

export interface SettingsActions {
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
  toggleLocalSectionCollapsed: () => void;
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
  setUseAccentColorForCheckboxes: (enabled: boolean) => void;
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
  setConnectivityCheckEnabled: (enabled: boolean) => void;
  setConnectivityCheckUrl: (url: string) => void;
  setConnectivityCheckInterval: (interval: number) => void;
  setWindowDecorationsMode: (mode: WindowDecorationsMode) => void;
  setEnablePush: (enabled: boolean) => void;
  setNtfyServerUrl: (url: string) => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
  resetSettings: () => void;
}

export type SettingsStore = SettingsState & SettingsActions;
