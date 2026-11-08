export type SortMode =
  | 'manual' // uses x-apple-sort-order
  | 'smart' // smart sort using x-apple-sort-order
  | 'status'
  | 'due-date'
  | 'start-date'
  | 'priority'
  | 'title'
  | 'modified'
  | 'created';
export type SortDirection = 'asc' | 'desc';
export interface SortConfig {
  mode: SortMode;
  direction: SortDirection;
}

export type TaskGroupMode =
  | 'none'
  | 'status'
  | 'priority'
  | 'calendar'
  | 'due-date'
  | 'start-date'
  | 'created'
  | 'modified';

export interface TaskGroupConfig {
  mode: TaskGroupMode;
  direction: SortDirection;
}

export type AccountSortMode = 'manual' | 'title' | 'task-count' | 'calendar-count';
export interface AccountSortConfig {
  mode: AccountSortMode;
  direction: SortDirection;
}

export type CalendarSortMode = 'manual' | 'server' | 'title' | 'task-count';
export interface CalendarSortConfig {
  mode: CalendarSortMode;
  direction: SortDirection;
}

export type TagSortMode = 'manual' | 'title' | 'task-count';
export interface TagSortConfig {
  mode: TagSortMode;
  direction: SortDirection;
}

export type FilterSortMode = 'manual' | 'title' | 'task-count';
export interface FilterSortConfig {
  mode: FilterSortMode;
  direction: SortDirection;
}
