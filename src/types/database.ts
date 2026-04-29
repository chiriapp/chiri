export interface TaskRow {
  id: string;
  uid: string;
  etag: string | null;
  href: string | null;
  title: string;
  description: string;
  completed: number;
  completed_at: string | null;
  status: string | null;
  percent_complete: number | null;
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
  parent_uid: string | null;
  is_collapsed: number | null; // Nullable in database schema (DEFAULT 0)
  sort_order: number;
  account_id: string | null; // Made nullable in v002 migration
  calendar_id: string | null; // Made nullable in v002 migration
  synced: number;
  local_only: number | null; // Nullable in database schema (DEFAULT 0)
  url: string | null;
  rrule: string | null;
  repeat_from: number;
}

export interface AccountRow {
  id: string;
  name: string;
  server_url: string;
  username: string;
  password: string;
  server_type: string | null;
  calendar_home_url: string | null;
  principal_url: string | null;
  last_sync: string | null;
  is_active: number;
  sort_order: number | null;
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
  sort_order: number | null;

  // WebDAV Push support
  push_topic: string | null;
  push_supported: number | null;
  push_vapid_key: string | null;
}

export interface TagRow {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  emoji: string | null;
  sort_order: number | null;
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
  show_unstarted_tasks: number;
  is_editor_open: number;
  account_sort_mode: string | null;
  account_sort_direction: string | null;
  calendar_sort_mode: string | null;
  calendar_sort_direction: string | null;
  tag_sort_mode: string | null;
  tag_sort_direction: string | null;
}

export interface ReminderRow {
  trigger: string;
  [key: string]: unknown;
}

export interface TaskHistoryEntry {
  id: string;
  taskUid: string;
  changedAt: Date;
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface TaskHistoryRow {
  id: string;
  task_uid: string;
  changed_at: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
}

export interface PushSubscriptionRow {
  id: string;
  calendar_id: string;
  account_id: string;
  registration_url: string;
  push_resource: string;
  expires_at: string;
  created_at: string;
}
