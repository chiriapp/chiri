import type { KeyboardShortcut } from '$types/shortcuts';
import type { SortDirection, SortMode } from '$types/sort';

export interface MenuCalendar {
  id: string;
  displayName: string;
  accountId?: string;
}

export interface MenuAccount {
  id: string;
  name: string;
  calendars?: MenuCalendar[];
}

export interface DockMenuFilter {
  id: string;
  label: string;
}

export interface MenuNavigationCalendar extends MenuCalendar {
  accountId: string;
}

export interface MenuNavigationItem {
  id: string;
  label: string;
}

export interface MenuNavigationOptions {
  filters?: MenuNavigationItem[];
  localCalendars?: MenuNavigationCalendar[];
  accountCalendars?: MenuAccount[];
  tags?: MenuNavigationItem[];
  activeListKey?: string;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
}

export interface AppMenuOptions {
  showCompleted?: boolean;
  moveCompletedTasksToBottom?: boolean;
  showUnstarted?: boolean;
  sortMode?: SortMode;
  sortDirection?: SortDirection;
  shortcuts?: KeyboardShortcut[];
  accounts?: MenuAccount[];
  navigation?: MenuNavigationOptions;
  caldavAccountCount?: number;
  isSyncing?: boolean;
  isModalOpen?: boolean;
}
