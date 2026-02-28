import type { SortDirection, SortMode } from '@/types';

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

export const DEFAULT_COLOR = '#3b82f6';
export const FALLBACK_ITEM_COLOR = '#3b82f6';
export const DEFAULT_DAY_OF_WEEK = 'monday';

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

export const TASK_LIST_INDENT_SHIFT_SIZE = 28;

export const MIN_SIDEBAR_WIDTH = 200;
export const MAX_SIDEBAR_WIDTH = 400;
