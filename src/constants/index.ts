import type { KeyboardShortcut } from '$types';
import type {
  AccountSortMode,
  CalendarSortMode,
  SortDirection,
  SortMode,
  TagSortMode,
} from '$types/sort';

export const DEFAULT_DAY_OF_WEEK = 'monday';

export const DEFAULT_CALENDAR_NAME = 'Default calendar';

export const RECENTLY_DELETED_RETENTION_DAYS = 30;
export const RECENTLY_DELETED_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

// default time for date pickers when no time is specified
export const DEFAULT_TIME = {
  hours: 12,
  minutes: 0,
} as const;

export const MODAL_SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
} as const;

export const JUST_NOW_SYNC_TEXT_MS_THRESHOLD = 60000;

export const DEFAULT_SORT_CONFIG = {
  mode: 'manual' as const satisfies SortMode,
  direction: 'asc' as const satisfies SortDirection,
};

export const DEFAULT_ACCOUNT_SORT_CONFIG = {
  mode: 'manual' as const satisfies AccountSortMode,
  direction: 'asc' as const satisfies SortDirection,
};

export const ACCOUNT_SORT_OPTIONS: Array<{ value: AccountSortMode; label: string }> = [
  { value: 'manual', label: 'Manual' },
  { value: 'title', label: 'Title' },
  { value: 'task-count', label: 'Task Count' },
  { value: 'calendar-count', label: 'Calendar Count' },
];

export const DEFAULT_CALENDAR_SORT_CONFIG = {
  mode: 'manual' as const satisfies CalendarSortMode,
  direction: 'asc' as const satisfies SortDirection,
};

export const CALENDAR_SORT_OPTIONS: Array<{ value: CalendarSortMode; label: string }> = [
  { value: 'manual', label: 'Manual' },
  { value: 'server', label: 'Server Order' },
  { value: 'title', label: 'Title' },
  { value: 'task-count', label: 'Task Count' },
];

export const DEFAULT_TAG_SORT_CONFIG = {
  mode: 'manual' as const satisfies TagSortMode,
  direction: 'asc' as const satisfies SortDirection,
};

export const TAG_SORT_OPTIONS: Array<{ value: TagSortMode; label: string }> = [
  { value: 'manual', label: 'Manual' },
  { value: 'title', label: 'Title' },
  { value: 'task-count', label: 'Task Count' },
];

export const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: 'manual', label: 'Manual' },
  { value: 'smart', label: 'Smart Sort' },
  { value: 'start-date', label: 'Start Date' },
  { value: 'due-date', label: 'Due Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title' },
  { value: 'modified', label: 'Last Modified' },
  { value: 'created', label: 'Created' },
];

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  { id: 'new-task', key: 'n', meta: true, description: 'Create new task' },
  {
    id: 'select-all-tasks',
    key: 'a',
    meta: true,
    description: 'Select all visible tasks',
  },
  { id: 'search', key: 'f', meta: true, description: 'Focus search' },
  { id: 'settings', key: ',', meta: true, description: 'Open settings' },
  {
    id: 'keyboard-shortcuts',
    key: '/',
    meta: true,
    description: 'Open keyboard shortcuts',
  },
  { id: 'sync', key: 'r', meta: true, description: 'Sync with server' },
  { id: 'import-tasks', key: 'i', meta: true, description: 'Import tasks' },
  {
    id: 'delete',
    key: 'Backspace',
    meta: true,
    description: 'Delete selected task',
  },
  { id: 'toggle-complete', key: 'x', description: 'Toggle task completion' },
  {
    id: 'toggle-show-completed',
    key: 'h',
    meta: true,
    shift: true,
    description: 'Toggle completed tasks',
  },
  { id: 'toggle-show-unstarted', key: 'u', meta: true, description: 'Toggle unstarted tasks' },
  { id: 'nav-up', key: 'ArrowUp', description: 'Navigate to previous task' },
  { id: 'nav-down', key: 'ArrowDown', description: 'Navigate to next task' },
  { id: 'nav-prev-list', key: '[', meta: true, description: 'Go to previous list' },
  { id: 'nav-next-list', key: ']', meta: true, description: 'Go to next list' },
  { id: 'toggle-sidebar', key: 'e', meta: true, description: 'Toggle sidebar' },
];

export const TASK_LIST_INDENT_SHIFT_SIZE = 28;

export const MIN_SIDEBAR_WIDTH = 256;
export const MAX_SIDEBAR_WIDTH = 600;
export const DEFAULT_SIDEBAR_WIDTH = 300;

export const MIN_EDITOR_WIDTH = 330;
export const MAX_EDITOR_WIDTH = 600;
export const DEFAULT_EDITOR_WIDTH = 400;
