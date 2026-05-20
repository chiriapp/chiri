import type {
  Account,
  AccountSortConfig,
  CalendarSortConfig,
  SortConfig,
  Tag,
  TagSortConfig,
  Task,
} from '$types';

export interface PendingDeletion {
  uid: string;
  href: string;
  accountId: string;
  calendarId: string;
}

export interface UIState {
  activeView: 'tasks' | 'recently-deleted';
  activeAccountId: string | null;
  activeCalendarId: string | null;
  activeTagId: string | null;
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
  accounts: Account[];
  pendingDeletions: PendingDeletion[];
  ui: UIState;
}

export type DataChangeListener = () => void;

export interface FlattenedTask extends Task {
  ancestorIds: string[];
  depth: number;
}
