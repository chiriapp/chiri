import { MENU_EVENTS } from '$constants/menu';
import type { SortMode } from '$types/sort';

/** sort modes exposed in the View › Sort By menu ('status' has no menu entry) */
export type MenuSortMode = Exclude<SortMode, 'status'>;

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

export const SORT_EVENTS: Record<MenuSortMode, string> = {
  manual: MENU_EVENTS.SORT_MANUAL,
  smart: MENU_EVENTS.SORT_SMART,
  priority: MENU_EVENTS.SORT_PRIORITY,
  'start-date': MENU_EVENTS.SORT_START_DATE,
  'due-date': MENU_EVENTS.SORT_DUE_DATE,
  title: MENU_EVENTS.SORT_TITLE,
  created: MENU_EVENTS.SORT_CREATED,
  modified: MENU_EVENTS.SORT_MODIFIED,
};
