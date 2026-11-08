import type DatabasePlugin from '@tauri-apps/plugin-sql';
import {
  DEFAULT_ACCOUNT_SORT_CONFIG,
  DEFAULT_CALENDAR_SORT_CONFIG,
  DEFAULT_FILTER_SORT_CONFIG,
  DEFAULT_SORT_CONFIG,
  DEFAULT_TAG_SORT_CONFIG,
  DEFAULT_TASK_GROUP_CONFIG,
} from '$constants';
import type { UIStateRow } from '$lib/database/types';
import type {
  AccountSortConfig,
  AccountSortMode,
  CalendarSortConfig,
  CalendarSortMode,
  FilterSortConfig,
  FilterSortMode,
  SortConfig,
  SortDirection,
  SortMode,
  TagSortConfig,
  TagSortMode,
  TaskGroupConfig,
} from '$types/sort';
import type { UIState } from '$types/store/state';

export const DEFAULT_UI_STATE: UIState = {
  activeView: 'tasks',
  activeAccountId: null,
  activeCalendarId: null,
  activeTagId: null,
  activeFilterId: null,
  selectedTaskId: null,
  searchQuery: '',
  sortConfig: DEFAULT_SORT_CONFIG,
  taskGroupConfig: DEFAULT_TASK_GROUP_CONFIG,
  accountSortConfig: DEFAULT_ACCOUNT_SORT_CONFIG,
  calendarSortConfig: DEFAULT_CALENDAR_SORT_CONFIG,
  tagSortConfig: DEFAULT_TAG_SORT_CONFIG,
  filterSortConfig: DEFAULT_FILTER_SORT_CONFIG,
  showCompletedTasks: true,
  moveCompletedTasksToBottom: false,
  showUnstartedTasks: true,
  isEditorOpen: false,
};

export const getUIState = async (conn: DatabasePlugin): Promise<UIState> => {
  const rows = await conn.select<UIStateRow[]>('SELECT * FROM ui_state WHERE id = 1');
  if (rows.length === 0) return DEFAULT_UI_STATE;

  const row = rows[0];
  const activeView =
    row.active_view === 'recently-deleted' || row.active_view === 'filter'
      ? row.active_view
      : 'tasks';

  return {
    activeView,
    activeAccountId: row.active_account_id,
    activeCalendarId: row.active_calendar_id,
    activeTagId: row.active_tag_id,
    activeFilterId: row.active_filter_id,
    selectedTaskId: row.selected_task_id,
    searchQuery: row.search_query,
    sortConfig: {
      mode: row.sort_mode as SortMode,
      direction: row.sort_direction as SortDirection,
    },
    taskGroupConfig: {
      mode: (row.task_group_mode ?? DEFAULT_TASK_GROUP_CONFIG.mode) as TaskGroupConfig['mode'],
      direction: (row.task_group_direction ?? DEFAULT_TASK_GROUP_CONFIG.direction) as SortDirection,
    },
    accountSortConfig: {
      mode: (row.account_sort_mode ?? 'manual') as AccountSortMode,
      direction: (row.account_sort_direction ?? 'asc') as SortDirection,
    },
    calendarSortConfig: {
      mode: (row.calendar_sort_mode ?? 'manual') as CalendarSortMode,
      direction: (row.calendar_sort_direction ?? 'asc') as SortDirection,
    },
    tagSortConfig: {
      mode: (row.tag_sort_mode ?? 'manual') as TagSortMode,
      direction: (row.tag_sort_direction ?? 'asc') as SortDirection,
    },
    filterSortConfig: {
      mode: (row.filter_sort_mode ?? DEFAULT_FILTER_SORT_CONFIG.mode) as FilterSortMode,
      direction: (row.filter_sort_direction ??
        DEFAULT_FILTER_SORT_CONFIG.direction) as SortDirection,
    },
    showCompletedTasks: row.show_completed_tasks === 1,
    moveCompletedTasksToBottom: row.move_completed_tasks_to_bottom === 1,
    showUnstartedTasks: row.show_unstarted_tasks === 1,
    isEditorOpen: row.is_editor_open === 1,
  };
};

export const setActiveAccount = async (conn: DatabasePlugin, id: string | null) => {
  await conn.execute(
    "UPDATE ui_state SET active_view = 'tasks', active_account_id = $1, active_calendar_id = NULL, active_tag_id = NULL, active_filter_id = NULL WHERE id = 1",
    [id],
  );
};

export const setActiveCalendar = async (conn: DatabasePlugin, id: string | null) => {
  await conn.execute(
    "UPDATE ui_state SET active_view = 'tasks', active_calendar_id = $1, active_tag_id = NULL, active_filter_id = NULL, selected_task_id = NULL, is_editor_open = 0 WHERE id = 1",
    [id],
  );
};

export const setActiveTag = async (conn: DatabasePlugin, id: string | null) => {
  await conn.execute(
    "UPDATE ui_state SET active_view = 'tasks', active_tag_id = $1, active_calendar_id = NULL, active_filter_id = NULL, selected_task_id = NULL, is_editor_open = 0 WHERE id = 1",
    [id],
  );
};

export const setActiveFilter = async (conn: DatabasePlugin, id: string | null) => {
  await conn.execute(
    "UPDATE ui_state SET active_view = 'filter', active_account_id = NULL, active_filter_id = $1, active_calendar_id = NULL, active_tag_id = NULL, selected_task_id = NULL, is_editor_open = 0 WHERE id = 1",
    [id],
  );
};

export const setAllTasksView = async (conn: DatabasePlugin) => {
  await conn.execute(
    "UPDATE ui_state SET active_view = 'tasks', active_account_id = NULL, active_calendar_id = NULL, active_tag_id = NULL, active_filter_id = NULL, selected_task_id = NULL, is_editor_open = 0 WHERE id = 1",
    [],
  );
};

export const setRecentlyDeletedView = async (conn: DatabasePlugin) => {
  await conn.execute(
    "UPDATE ui_state SET active_view = 'recently-deleted', active_account_id = NULL, active_calendar_id = NULL, active_tag_id = NULL, active_filter_id = NULL, selected_task_id = NULL, is_editor_open = 0 WHERE id = 1",
    [],
  );
};

export const setSelectedTask = async (conn: DatabasePlugin, id: string | null) => {
  await conn.execute(
    'UPDATE ui_state SET selected_task_id = $1, is_editor_open = $2 WHERE id = 1',
    [id, id !== null ? 1 : 0],
  );
};

export const setEditorOpen = async (conn: DatabasePlugin, open: boolean) => {
  const uiState = await getUIState(conn);
  await conn.execute(
    'UPDATE ui_state SET is_editor_open = $1, selected_task_id = $2 WHERE id = 1',
    [open ? 1 : 0, open ? uiState.selectedTaskId : null],
  );
};

export const setSearchQuery = async (conn: DatabasePlugin, query: string) => {
  await conn.execute('UPDATE ui_state SET search_query = $1 WHERE id = 1', [query]);
};

export const setSortConfig = async (conn: DatabasePlugin, config: SortConfig) => {
  await conn.execute('UPDATE ui_state SET sort_mode = $1, sort_direction = $2 WHERE id = 1', [
    config.mode,
    config.direction,
  ]);
};

export const setTaskGroupConfig = async (conn: DatabasePlugin, config: TaskGroupConfig) => {
  await conn.execute(
    'UPDATE ui_state SET task_group_mode = $1, task_group_direction = $2 WHERE id = 1',
    [config.mode, config.direction],
  );
};

export const setAccountSortConfig = async (conn: DatabasePlugin, config: AccountSortConfig) => {
  await conn.execute(
    'UPDATE ui_state SET account_sort_mode = $1, account_sort_direction = $2 WHERE id = 1',
    [config.mode, config.direction],
  );
};

export const setCalendarSortConfig = async (conn: DatabasePlugin, config: CalendarSortConfig) => {
  await conn.execute(
    'UPDATE ui_state SET calendar_sort_mode = $1, calendar_sort_direction = $2 WHERE id = 1',
    [config.mode, config.direction],
  );
};

export const setTagSortConfig = async (conn: DatabasePlugin, config: TagSortConfig) => {
  await conn.execute(
    'UPDATE ui_state SET tag_sort_mode = $1, tag_sort_direction = $2 WHERE id = 1',
    [config.mode, config.direction],
  );
};

export const setFilterSortConfig = async (conn: DatabasePlugin, config: FilterSortConfig) => {
  await conn.execute(
    'UPDATE ui_state SET filter_sort_mode = $1, filter_sort_direction = $2 WHERE id = 1',
    [config.mode, config.direction],
  );
};

export const setShowCompletedTasks = async (conn: DatabasePlugin, show: boolean) => {
  await conn.execute('UPDATE ui_state SET show_completed_tasks = $1 WHERE id = 1', [show ? 1 : 0]);
};

export const setMoveCompletedTasksToBottom = async (
  conn: DatabasePlugin,
  moveToBottom: boolean,
) => {
  await conn.execute('UPDATE ui_state SET move_completed_tasks_to_bottom = $1 WHERE id = 1', [
    moveToBottom ? 1 : 0,
  ]);
};

export const setShowUnstartedTasks = async (conn: DatabasePlugin, show: boolean) => {
  await conn.execute('UPDATE ui_state SET show_unstarted_tasks = $1 WHERE id = 1', [show ? 1 : 0]);
};
