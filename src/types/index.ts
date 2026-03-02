export type Priority = 'high' | 'medium' | 'low' | 'none';

export type SortMode =
  | 'manual' // uses x-apple-sort-order
  | 'due-date'
  | 'start-date'
  | 'priority'
  | 'title'
  | 'modified'
  | 'created'
  | 'smart'; // smart sort using x-apple-sort-order

export type SortDirection = 'asc' | 'desc';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Reminder {
  id: string;
  trigger: Date; // absolute date/time when the reminder should fire
}

export interface Task {
  id: string;
  uid: string; // CalDAV UID
  etag?: string; // CalDAV ETag for sync
  href?: string; // CalDAV href

  // core fields
  title: string;
  description: string;
  completed: boolean;
  completedAt?: Date;

  // categorization
  tags?: string[]; // Array of tag IDs (maps to iCal CATEGORIES)
  categoryId?: string; // Raw CATEGORIES string from CalDAV (used during sync, mapped to tags)
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

  // subtasks / checklist (deprecated - use parentUid instead)
  subtasks: Subtask[];

  // parent-child relationship (RELATED-TO in CalDAV)
  parentUid?: string; // UID of parent task
  isCollapsed?: boolean; // Whether subtasks are collapsed in UI

  // sorting
  sortOrder: number; // x-apple-sort-order

  // URL (RFC 7986)
  url?: string;

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
}

export type ServerType = 'rustical' | 'radicale' | 'baikal' | 'nextcloud' | 'generic';

export interface Account {
  id: string;
  name: string;
  serverUrl: string;
  username: string;
  password: string;
  serverType?: ServerType;
  calendars: Calendar[];
  lastSync?: Date;
  isActive: boolean;
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
  confirmBeforeDelete: boolean;
}

export type SettingsCategory = 'general' | 'account' | 'about';
export type SettingsSubtab =
  | 'behavior'
  | 'appearance'
  | 'notifications'
  | 'shortcuts'
  | 'defaults'
  | 'connections'
  | 'sync'
  | 'data'
  | 'version';

export type ExportFormat = 'ics' | 'json' | 'markdown' | 'csv';
export type ExportType = 'tasks' | 'all-calendars' | 'single-calendar';

// Database row types
export interface TaskRow {
  id: string;
  uid: string;
  etag: string | null;
  href: string | null;
  title: string;
  description: string;
  completed: number;
  completed_at: string | null;
  tags: string | null;
  category_id: string | null;
  priority: string;
  start_date: string | null;
  start_date_all_day: number | null; // Nullable in database schema
  due_date: string | null;
  due_date_all_day: number | null; // Nullable in database schema
  created_at: string;
  modified_at: string;
  reminders: string | null;
  subtasks: string;
  parent_uid: string | null;
  is_collapsed: number | null; // Nullable in database schema (DEFAULT 0)
  sort_order: number;
  account_id: string | null; // Made nullable in v002 migration
  calendar_id: string | null; // Made nullable in v002 migration
  synced: number;
  local_only: number | null; // Nullable in database schema (DEFAULT 0)
  url: string | null;
}

export interface AccountRow {
  id: string;
  name: string;
  server_url: string;
  username: string;
  password: string;
  server_type: string | null;
  last_sync: string | null;
  is_active: number;
}

export interface CalendarRow {
  id: string;
  account_id: string;
  display_name: string;
  url: string;
  ctag: string | null;
  sync_token: string | null;
  color: string | null;
  icon: string | null;
  emoji: string | null;
  supported_components: string | null;
}

export interface TagRow {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  emoji: string | null;
}

export interface PendingDeletionRow {
  uid: string;
  href: string;
  account_id: string;
  calendar_id: string;
}

export interface UIStateRow {
  id: number;
  active_account_id: string | null;
  active_calendar_id: string | null;
  active_tag_id: string | null;
  selected_task_id: string | null;
  search_query: string;
  sort_mode: string;
  sort_direction: string;
  show_completed_tasks: number;
  is_editor_open: number;
}

export interface ReminderRow {
  trigger: string;
  [key: string]: unknown;
}

export type SubtaskDeletionBehavior = 'delete' | 'keep';
export type Theme = 'light' | 'dark' | 'system';
export type AccentColor = string;
export type StartOfWeek = 'sunday' | 'monday';

export interface KeyboardShortcut {
  id: string;
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
}
