import type {
  AccountSortMode,
  CalendarSortMode,
  KeyboardShortcut,
  SortDirection,
  SortMode,
  TagSortMode,
} from '$types/index';

// color presets for calendars, tags, etc
export const COLOR_PRESETS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
] as const;

// accent colors for the theme/settings
export const ACCENT_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
] as const;

export const DEFAULT_COLOR = '#ec4899';
export const FALLBACK_ITEM_COLOR = '#ec4899';
export const DEFAULT_DAY_OF_WEEK = 'monday';

// Default time for date pickers when no time is specified
export const DEFAULT_TIME = {
  hours: 12,
  minutes: 0,
} as const;

export const MODAL_SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
} as const;

export const JUST_NOW_SYNC_TEXT_MS_THRESHOLD = 10000;

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
];

export const DEFAULT_CALENDAR_SORT_CONFIG = {
  mode: 'manual' as const satisfies CalendarSortMode,
  direction: 'asc' as const satisfies SortDirection,
};

export const CALENDAR_SORT_OPTIONS: Array<{ value: CalendarSortMode; label: string }> = [
  { value: 'manual', label: 'Manual' },
  { value: 'server', label: 'Server Order' },
  { value: 'title', label: 'Title' },
];

export const DEFAULT_TAG_SORT_CONFIG = {
  mode: 'manual' as const satisfies TagSortMode,
  direction: 'asc' as const satisfies SortDirection,
};

export const TAG_SORT_OPTIONS: Array<{ value: TagSortMode; label: string }> = [
  { value: 'manual', label: 'Manual' },
  { value: 'title', label: 'Title' },
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
  { id: 'search', key: 'f', meta: true, description: 'Focus search' },
  { id: 'settings', key: ',', meta: true, description: 'Open settings' },
  {
    id: 'keyboard-shortcuts',
    key: '/',
    meta: true,
    description: 'Open keyboard shortcuts',
  },
  { id: 'sync', key: 'r', meta: true, description: 'Sync with server' },
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
  { id: 'close', key: 'Escape', description: 'Close editor / Clear search' },
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
