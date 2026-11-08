import type { Account } from '$types/account';
import type { Filter } from '$types/filter';
import type {
  AccountSortConfig,
  CalendarSortConfig,
  FilterSortConfig,
  SortConfig,
  TagSortConfig,
  TaskGroupConfig,
} from '$types/sort';
import type { PendingDeletion } from '$types/store/sync';
import type { Tag } from '$types/tag';
import type { Task } from '$types/task/model';

export interface UIState {
  activeView: 'tasks' | 'recently-deleted' | 'filter';
  activeAccountId: string | null;
  activeCalendarId: string | null;
  activeTagId: string | null;
  activeFilterId: string | null;
  selectedTaskId: string | null;
  searchQuery: string;
  sortConfig: SortConfig;
  taskGroupConfig: TaskGroupConfig;
  accountSortConfig: AccountSortConfig;
  calendarSortConfig: CalendarSortConfig;
  tagSortConfig: TagSortConfig;
  filterSortConfig: FilterSortConfig;
  showCompletedTasks: boolean;
  moveCompletedTasksToBottom: boolean;
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
