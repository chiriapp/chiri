import type { Account, Tag, Task } from '$types';
import type { Filter } from '$types/filter';
import type { AccountSortConfig, CalendarSortConfig, SortConfig, TagSortConfig } from '$types/sort';

export interface PendingDeletion {
  uid: string;
  href: string;
  accountId: string;
  calendarId: string;
  etag?: string;
  deletedAt?: Date;
  attemptCount?: number;
  lastAttemptAt?: Date;
  lastError?: string;
}

export interface UIState {
  activeView: 'tasks' | 'recently-deleted' | 'filter';
  activeAccountId: string | null;
  activeCalendarId: string | null;
  activeTagId: string | null;
  activeFilterId: string | null;
  selectedTaskId: string | null;
  searchQuery: string;
  sortConfig: SortConfig;
  accountSortConfig: AccountSortConfig;
  calendarSortConfig: CalendarSortConfig;
  tagSortConfig: TagSortConfig;
  showCompletedTasks: boolean;
  showUnstartedTasks: boolean;
  isEditorOpen: boolean;
}

export interface DataStore {
  tasks: Task[];
  tags: Tag[];
  filters: Filter[];
  accounts: Account[];
  pendingDeletions: PendingDeletion[];
  ui: UIState;
}

export type DataChangeListener = () => void;

export interface FlattenedTask extends Task {
  ancestorIds: string[];
  depth: number;
}
