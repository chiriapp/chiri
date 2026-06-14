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

  // WebDAV Push support (draft spec)
  pushTopic?: string; // Unique topic identifier for WebDAV Push messages
  pushSupported?: boolean; // Whether server supports WebDAV Push
  pushVapidKey?: string; // VAPID public key for Web Push (base64url)
}

export type Priority = 'high' | 'medium' | 'low' | 'none';

export type TaskStatus = 'needs-action' | 'in-process' | 'completed' | 'cancelled';

export interface Reminder {
  id: string;
  trigger: Date; // absolute date/time when the reminder fires (resolved from relative if needed)
  relativeOffset?: number; // milliseconds; if set, this was a relative trigger and should round-trip as one
  relatedTo?: 'start' | 'end'; // which date the offset is relative to (RELATED=START/END)
  repeat?: number; // RFC 5545 REPEAT: number of additional repetitions after the initial trigger
  duration?: number; // RFC 5545 DURATION (ms): delay between repetitions; required when repeat is set
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
  deletedAt?: Date;

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

export interface CalDAVTaskObject {
  taskUid: string;
  accountId: string;
  calendarId: string;
  href: string;
  etag?: string;
  vtodo: string;
  lastSyncAt: Date;
}

export interface TaskWithCalDAVObject extends Task {
  caldavObject: CalDAVTaskObject;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  icon?: string; // Icon name from lucide-react
  emoji?: string; // Emoji character(s)
  sortOrder: number;
}

export type ServerType =
  | 'generic'
  | 'fastmail'
  | 'fruux'
  | 'mailbox'
  | 'migadu'
  | 'purelymail'
  | 'runbox'
  | 'baikal'
  | 'nextcloud'
  | 'radicale'
  | 'rustical'
  | 'vikunja'
  | 'xandikos';

export interface CalDAVConfig {
  serverUrl: string;
  username: string;
  password: string;
  serverType: ServerType;
  calendarHomeUrl?: string;
  principalUrl?: string;
  acceptInvalidCerts?: boolean;
  authType: 'basic' | 'oauth';
  refreshToken?: string;
  tokenExpiry?: string;
}

export interface Account {
  id: string;
  name: string;
  icon?: string;
  emoji?: string;
  calendars: Calendar[];
  lastSync?: Date;
  isActive: boolean;
  sortOrder: number;
  caldav: CalDAVConfig | null;
}

export type ExportFormat = 'ics' | 'json' | 'markdown' | 'csv';
export type ExportType = 'tasks' | 'all-calendars' | 'single-calendar';

export interface KeyboardShortcut {
  id: string;
  key?: string;
  ctrl?: boolean;
  meta?: boolean;
  super?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
}

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

export type InstallType = 'nix' | 'aur' | 'flatpak' | 'homebrew' | 'standard';
