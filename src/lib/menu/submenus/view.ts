import { emit } from '@tauri-apps/api/event';
import { CheckMenuItem, MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu';
import { MENU_EVENTS } from '$constants/menu';
import { getAcceleratorOrDefault } from '$lib/menu/accelerators';
import { GROUP_MENU_OPTIONS, isGroupDirectionEnabled, isGroupModeEnabled } from '$lib/menu/group';
import { radioItem, sectionHeader, separator } from '$lib/menu/items';
import { isEnabledOutsideModal } from '$lib/menu/modal';
import { type MenuSortMode, SORT_EVENTS, SORT_LABELS } from '$lib/menu/sort';
import { trackMenuItem } from '$lib/menu/state';
import type { KeyboardShortcut } from '$types/shortcuts';
import type { SortDirection, SortMode, TaskGroupMode } from '$types/sort';

const SORT_OPTIONS = Object.entries(SORT_LABELS) as [MenuSortMode, string][];

const DIRECTIONS = [
  { id: 'asc', label: 'Ascending', direction: 'asc' },
  { id: 'desc', label: 'Descending', direction: 'desc' },
] as const;

const SORT_DIRECTION_EVENTS: Record<SortDirection, string> = {
  asc: MENU_EVENTS.SORT_DIRECTION_ASC,
  desc: MENU_EVENTS.SORT_DIRECTION_DESC,
};

const GROUP_DIRECTION_EVENTS: Record<SortDirection, string> = {
  asc: MENU_EVENTS.GROUP_DIRECTION_ASC,
  desc: MENU_EVENTS.GROUP_DIRECTION_DESC,
};

const createDirectionItems = async ({
  idPrefix,
  selected,
  enabled,
  events,
}: {
  idPrefix: string;
  selected: SortDirection;
  enabled: boolean;
  events: Record<SortDirection, string>;
}) =>
  Promise.all(
    DIRECTIONS.map(({ id, label, direction }) =>
      radioItem({
        id: `${idPrefix}-${id}`,
        text: label,
        checked: selected === direction,
        enabled,
        action: () => emit(events[direction]),
      }),
    ),
  );

export const createViewSubmenu = async ({
  showCompleted,
  moveCompletedTasksToBottom,
  showUnstarted,
  sortMode,
  sortDirection,
  taskGroupMode,
  taskGroupDirection,
  activeCalendarId,
  shortcuts,
  isModalOpen,
}: {
  showCompleted: boolean;
  moveCompletedTasksToBottom: boolean;
  showUnstarted: boolean;
  sortMode: SortMode;
  sortDirection: SortDirection;
  taskGroupMode: TaskGroupMode;
  taskGroupDirection: SortDirection;
  activeCalendarId: string | null;
  shortcuts?: KeyboardShortcut[];
  isModalOpen: boolean;
}) => {
  const isAppActionEnabled = (enabled = true) => isEnabledOutsideModal(isModalOpen, enabled);

  const toggleCompletedItem = trackMenuItem(
    await CheckMenuItem.new({
      id: 'toggle-completed',
      text: 'Show Completed Tasks',
      accelerator: getAcceleratorOrDefault(shortcuts, 'toggle-show-completed', 'CmdOrCtrl+Shift+H'),
      checked: showCompleted,
      enabled: isAppActionEnabled(),
      action: () => {
        emit(MENU_EVENTS.TOGGLE_COMPLETED);
      },
    }),
  );

  const toggleCompletedToBottomItem = trackMenuItem(
    await CheckMenuItem.new({
      id: 'toggle-completed-to-bottom',
      text: 'Move Completed Tasks to Bottom',
      accelerator: getAcceleratorOrDefault(
        shortcuts,
        'toggle-completed-to-bottom',
        'CmdOrCtrl+Shift+B',
      ),
      checked: moveCompletedTasksToBottom,
      enabled: isAppActionEnabled(showCompleted),
      action: () => {
        emit(MENU_EVENTS.TOGGLE_COMPLETED_TO_BOTTOM);
      },
    }),
  );

  const toggleUnstartedItem = trackMenuItem(
    await CheckMenuItem.new({
      id: 'toggle-unstarted',
      text: 'Show Unstarted Tasks',
      accelerator: getAcceleratorOrDefault(shortcuts, 'toggle-show-unstarted', 'CmdOrCtrl+U'),
      checked: showUnstarted,
      enabled: isAppActionEnabled(),
      action: () => {
        emit(MENU_EVENTS.TOGGLE_UNSTARTED);
      },
    }),
  );

  const tasksHeaderItem = await sectionHeader('view-tasks-header', 'Tasks');

  const sortItems = await Promise.all(
    SORT_OPTIONS.map(([mode, label]) =>
      radioItem({
        id: `sort-${mode}`,
        text: label,
        checked: sortMode === mode,
        enabled: isAppActionEnabled(),
        action: () => emit(SORT_EVENTS[mode]),
      }),
    ),
  );

  const sortDirectionItems = await createDirectionItems({
    idPrefix: 'sort-direction',
    selected: sortDirection,
    enabled: isAppActionEnabled(sortMode !== 'manual'),
    events: SORT_DIRECTION_EVENTS,
  });

  const sortDirectionSubmenu = trackMenuItem(
    await Submenu.new({
      id: 'sort-direction-submenu',
      text: 'Sort Direction',
      enabled: sortMode !== 'manual',
      items: sortDirectionItems,
    }),
  );

  const groupItems = await Promise.all(
    GROUP_MENU_OPTIONS.map((option) =>
      radioItem({
        id: option.id,
        text: option.label,
        checked: taskGroupMode === option.mode,
        enabled: isAppActionEnabled(isGroupModeEnabled(option.mode, activeCalendarId)),
        action: () => emit(option.event),
      }),
    ),
  );

  const groupDirectionEnabled = isGroupDirectionEnabled(taskGroupMode, activeCalendarId);

  const groupDirectionItems = await createDirectionItems({
    idPrefix: 'group-direction',
    selected: taskGroupDirection,
    enabled: isAppActionEnabled(groupDirectionEnabled),
    events: GROUP_DIRECTION_EVENTS,
  });

  const groupDirectionSubmenu = trackMenuItem(
    await Submenu.new({
      id: 'group-direction-submenu',
      text: 'Group Direction',
      enabled: groupDirectionEnabled,
      items: groupDirectionItems,
    }),
  );

  return Submenu.new({
    text: 'View',
    items: [
      toggleCompletedItem,
      toggleUnstartedItem,
      toggleCompletedToBottomItem,
      await separator(),
      tasksHeaderItem,
      await Submenu.new({ text: 'Sort By', items: sortItems }),
      sortDirectionSubmenu,
      await Submenu.new({ text: 'Group By', items: groupItems }),
      groupDirectionSubmenu,
      await separator(),
      await MenuItem.new({
        id: 'toggle-sidebar',
        text: 'Toggle Sidebar',
        accelerator: getAcceleratorOrDefault(shortcuts, 'toggle-sidebar', 'CmdOrCtrl+E'),
        enabled: isAppActionEnabled(),
        action: () => {
          emit(MENU_EVENTS.TOGGLE_SIDEBAR);
        },
      }),
      await separator(),
      await PredefinedMenuItem.new({
        text: 'Enter Full Screen',
        item: 'Fullscreen',
      }),
    ],
  });
};
