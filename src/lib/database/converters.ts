import type { Account, Calendar, Priority, ServerType, Tag, Task, TaskStatus } from '$types';
import type { AccountRow, CalendarRow, ReminderRow, TagRow, TaskRow } from '$types/database';

export const rowToTask = (row: TaskRow): Task => {
  const status =
    (row.status as TaskStatus | null) ?? (row.completed === 1 ? 'completed' : 'needs-action');

  return {
    id: row.id,
    uid: row.uid,
    etag: row.etag || undefined,
    href: row.href || undefined,
    title: row.title,
    description: row.description,
    status,
    completed: status === 'completed',
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    percentComplete: row.percent_complete ?? undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    categoryId: row.category_id || undefined,
    priority: row.priority as Priority,
    startDate: row.start_date ? new Date(row.start_date) : undefined,
    startDateAllDay: row.start_date_all_day === null ? undefined : row.start_date_all_day === 1,
    dueDate: row.due_date ? new Date(row.due_date) : undefined,
    dueDateAllDay: row.due_date_all_day === null ? undefined : row.due_date_all_day === 1,
    createdAt: new Date(row.created_at),
    modifiedAt: new Date(row.modified_at),
    reminders: row.reminders
      ? JSON.parse(row.reminders).map((r: ReminderRow) => ({
          ...r,
          trigger: new Date(r.trigger),
        }))
      : undefined,
    parentUid: row.parent_uid || undefined,
    isCollapsed: row.is_collapsed === null ? undefined : row.is_collapsed === 1,
    sortOrder: row.sort_order,
    url: row.url || undefined,
    accountId: row.account_id ?? '',
    calendarId: row.calendar_id ?? '',
    synced: row.synced === 1,
    localOnly: row.local_only === null ? undefined : row.local_only === 1,
    rrule: row.rrule ?? undefined,
    repeatFrom: row.repeat_from ?? 0,
  };
};

export const rowToCalendar = (row: CalendarRow): Calendar => ({
  id: row.id,
  displayName: row.display_name,
  url: row.url,
  ctag: row.ctag || undefined,
  syncToken: row.sync_token || undefined,
  color: row.color || undefined,
  icon: row.icon || undefined,
  emoji: row.emoji || undefined,
  accountId: row.account_id,
  supportedComponents: row.supported_components ? JSON.parse(row.supported_components) : undefined,
  sortOrder: row.sort_order ?? 0,
  // WebDAV Push properties
  pushTopic: row.push_topic || undefined,
  pushSupported: row.push_supported === 1,
  pushVapidKey: row.push_vapid_key || undefined,
});

export const rowToAccount = (row: AccountRow, calendars: Calendar[]): Account => ({
  id: row.id,
  name: row.name,
  serverUrl: row.server_url,
  username: row.username,
  password: row.password,
  serverType: (row.server_type as ServerType) || undefined,
  icon: row.icon || undefined,
  emoji: row.emoji || undefined,
  calendarHomeUrl: row.calendar_home_url || undefined,
  principalUrl: row.principal_url || undefined,
  calendars: calendars.filter((c) => c.accountId === row.id),
  lastSync: row.last_sync ? new Date(row.last_sync) : undefined,
  isActive: row.is_active === 1,
  sortOrder: row.sort_order ?? 0,
  acceptInvalidCerts:
    row.accept_invalid_certs === null ? undefined : row.accept_invalid_certs === 1,
});

export const rowToTag = (row: TagRow): Tag => ({
  id: row.id,
  name: row.name,
  color: row.color,
  icon: row.icon || undefined,
  emoji: row.emoji || undefined,
  sortOrder: row.sort_order ?? 0,
});
