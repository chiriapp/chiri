import type { SortMode } from '$types/sort';

/** sort modes exposed in the View › Sort By menu ('status' has no menu entry) */
type MenuSortMode = Exclude<SortMode, 'status'>;

export const SORT_LABELS: Record<MenuSortMode, string> = {
  manual: 'Manual',
  smart: 'Smart Sort',
  priority: 'Priority',
  'start-date': 'Start Date',
  'due-date': 'Due Date',
  title: 'Title',
  created: 'Date Created',
  modified: 'Date Modified',
};

/** the active sort mode is marked with a leading checkmark (radio button behavior) */
export const withCheckmark = (label: string, checked: boolean) => (checked ? `✓ ${label}` : label);
