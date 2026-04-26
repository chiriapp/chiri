export type InstallType = 'nix' | 'aur' | 'flatpak' | 'standard';

export type Priority = 'high' | 'medium' | 'low' | 'none';

export type TaskStatus = 'needs-action' | 'in-process' | 'completed' | 'cancelled';

export type DefaultReminderOffset =
  | 'at-due'
  | '5min-before-due'
  | '15min-before-due'
  | '30min-before-due'
  | '1hr-before-due'
  | '2hr-before-due'
  | '1day-before-due'
  | '2days-before-due'
  | '1week-before-due';

export type DefaultDateOffset =
  | 'none'
  | 'today'
  | 'tomorrow'
  | '1week'
  | '2weeks'
  | 'due-date'
  | 'due-time'
  | '1day-before-due'
  | '1week-before-due';

export type AccountSortMode = 'manual' | 'title';

export interface AccountSortConfig {
  mode: AccountSortMode;
  direction: SortDirection;
}

export type CalendarSortMode = 'manual' | 'server' | 'title';

export interface CalendarSortConfig {
  mode: CalendarSortMode;
  direction: SortDirection;
}

export type TagSortMode = 'manual' | 'title';

export interface TagSortConfig {
  mode: TagSortMode;
  direction: SortDirection;
}

export type SortMode =
  | 'manual' // uses x-apple-sort-order
  | 'smart' // smart sort using x-apple-sort-order
  | 'due-date'
  | 'start-date'
  | 'priority'
  | 'title'
  | 'modified'
  | 'created';

export type SortDirection = 'asc' | 'desc';

export interface Reminder {
  id: string;
  trigger: Date; // absolute date/time when the reminder should fire
}

export interface Task {
  id: string;
  uid: string;
  etag?: string; // CalDAV ETag for sync
  href?: string;

  // core fields
  title: string;
  description: string;
  status: TaskStatus;
  completed: boolean; // derived: status === 'completed'
  completedAt?: Date;
  percentComplete?: number; // 0-100, RFC 5545 PERCENT-COMPLETE

  // categorization
  tags?: string[]; // Array of tag IDs (maps to iCal CATEGORIES)
  categoryId?: string; // Raw CATEGORIES string from CalDAV (used during sync, mapped to tags)
  tagColorsByName?: Record<string, string>; // Lowercase tag name -> #RRGGBB from X-TASKS-TAG-COLOR
  priority: Priority;

  // dates
  startDate?: Date;
  startDateAllDay?: boolean; // if true, startDate is all-day (no time component)
  dueDate?: Date;
  dueDateAllDay?: boolean; // if true, dueDate is all-day (no time component)
  createdAt: Date;
  modifiedAt: Date;

  // reminders
  reminders?: Reminder[];

  // parent-child relationship (RELATED-TO in CalDAV)
  parentUid?: string; // UID of parent task
  isCollapsed?: boolean; // Whether subtasks are collapsed in UI

  // sorting
  sortOrder: number; // x-apple-sort-order

  // URL (RFC 7986)
  url?: string;

  // recurrence (RFC 5545)
  rrule?: string; // RRULE value string, e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  repeatFrom?: number; // 0 = due date (default), 1 = completion date

  // sync
  accountId: string;
  calendarId: string;
  synced: boolean;
  localOnly?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  icon?: string; // Icon name from lucide-react
  emoji?: string; // Emoji character(s)
  sortOrder: number;
}

export interface Calendar {
  id: string;
  displayName: string;
  url: string;
  ctag?: string;
  syncToken?: string;
  color?: string;
  icon?: string; // Icon name from lucide-react
  emoji?: string; // Emoji character(s)
  accountId: string;
  supportedComponents?: string[]; // e.g., ['VTODO', 'VEVENT']
  sortOrder: number; // apple-calendar-order
}

export type ServerType =
  | 'rustical'
  | 'radicale'
  | 'baikal'
  | 'nextcloud'
  | 'mailbox'
  | 'fastmail'
  | 'fruux'
  | 'generic';

export interface Account {
  id: string;
  name: string;
  serverUrl: string;
  username: string;
  password: string;
  serverType?: ServerType;
  calendarHomeUrl?: string;
  calendars: Calendar[];
  lastSync?: Date;
  isActive: boolean;
  sortOrder: number;
}

export interface SortConfig {
  mode: SortMode;
  direction: SortDirection;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  defaultSortMode: SortMode;
  defaultSortDirection: SortDirection;
  showCompletedTasks: boolean;
  showUnstartedTasks: boolean;
  confirmBeforeDelete: boolean;
}

export type SettingsCategory = 'tasks' | 'app' | 'accounts' | 'misc';
export type SettingsSubtab =
  | 'behavior'
  | 'defaults'
  | 'editor'
  | 'badges'
  | 'look-and-feel'
  | 'notifications'
  | 'region-and-time'
  | 'keyboard-shortcuts'
  | 'system'
  | 'connections'
  | 'data'
  | 'sync'
  | 'updates'
  | 'about';

export type ExportFormat = 'ics' | 'json' | 'markdown' | 'csv';
export type ExportType = 'tasks' | 'all-calendars' | 'single-calendar';

export type SubtaskDeletionBehavior = 'delete' | 'keep';
export type Theme = 'light' | 'dark' | 'system';
export type AccentColor = string;
export type StartOfWeek =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';
export type TimeFormat = '12' | '24';
export type DateFormat = 'MMM d, yyyy' | 'd MMM yyyy' | 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd';

export interface KeyboardShortcut {
  id: string;
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
}
