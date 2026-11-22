import { TASK_GROUP_OPTIONS } from '$constants';
import { MENU_EVENTS } from '$constants/menu';
import type { TaskGroupMode } from '$types/sort';

const GROUP_MODE_EVENTS: Record<TaskGroupMode, string> = {
  none: MENU_EVENTS.GROUP_NONE,
  status: MENU_EVENTS.GROUP_STATUS,
  calendar: MENU_EVENTS.GROUP_CALENDAR,
  'start-date': MENU_EVENTS.GROUP_START_DATE,
  'due-date': MENU_EVENTS.GROUP_DUE_DATE,
  priority: MENU_EVENTS.GROUP_PRIORITY,
  modified: MENU_EVENTS.GROUP_MODIFIED,
  created: MENU_EVENTS.GROUP_CREATED,
};

export interface GroupMenuOption {
  mode: TaskGroupMode;
  id: string;
  label: string;
  event: string;
}

/** group modes exposed in the View › Group By menu, in the same order as the header menu */
export const GROUP_MENU_OPTIONS: GroupMenuOption[] = TASK_GROUP_OPTIONS.map((option) => ({
  mode: option.value,
  id: `group-${option.value}`,
  label: option.label,
  event: GROUP_MODE_EVENTS[option.value],
}));

/** the tasks a single calendar holds can't be grouped by calendar */
export const isGroupModeEnabled = (mode: TaskGroupMode, activeCalendarId: string | null) =>
  mode !== 'calendar' || activeCalendarId === null;

/** grouping direction has no meaning when groups are off, mirroring the header menu */
export const isGroupDirectionEnabled = (mode: TaskGroupMode, activeCalendarId: string | null) =>
  mode !== 'none' && activeCalendarId === null;
