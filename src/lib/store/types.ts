import type { Account, SortConfig, Tag, Task } from '$types/index';

// Pending deletion interface
export interface PendingDeletion {
  uid: string;
  href: string;
  accountId: string;
  calendarId: string;
}

// UI State interface
export interface UIState {
  activeAccountId: string | null;
  activeCalendarId: string | null;
  activeTagId: string | null;
  selectedTaskId: string | null;
  searchQuery: string;
  sortConfig: SortConfig;
  showCompletedTasks: boolean;
  showUnstartedTasks: boolean;
  isEditorOpen: boolean;
}

// Complete data store interface
export interface DataStore {
  tasks: Task[];
  tags: Tag[];
  accounts: Account[];
  pendingDeletions: PendingDeletion[];
  ui: UIState;
}

// Event listeners for data changes
export type DataChangeListener = () => void;

// Flattened task for reordering operations
export interface FlattenedTask {
  id: string;
  uid: string;
  title: string;
  depth: number;
  parentUid?: string;
  ancestorIds: string[];
  sortOrder: number;
}
