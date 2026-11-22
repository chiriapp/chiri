import { emit } from '@tauri-apps/api/event';
import { CheckMenuItem, MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu';
import { MENU_EVENTS } from '$constants/menu';
import { getAcceleratorOrDefault } from '$lib/menu/accelerators';
import { GROUP_MENU_OPTIONS, isGroupDirectionEnabled, isGroupModeEnabled } from '$lib/menu/group';
import { separator, withCheckmark } from '$lib/menu/items';
import { isEnabledOutsideModal } from '$lib/menu/modal';
import { SORT_LABELS } from '$lib/menu/sort';
import { trackMenuItem } from '$lib/menu/state';
import type { KeyboardShortcut } from '$types/shortcuts';
import type { SortDirection, SortMode, TaskGroupMode } from '$types/sort';

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

  const tasksHeaderItem = await MenuItem.new({
    id: 'view-tasks-header',
    text: 'Tasks',
    enabled: false,
  });

  const sortManualItem = trackMenuItem(
    await MenuItem.new({
      id: 'sort-manual',
      text: withCheckmark(SORT_LABELS.manual, sortMode === 'manual'),
      enabled: isAppActionEnabled(),
      action: () => {
        emit(MENU_EVENTS.SORT_MANUAL);
      },
    }),
  );

  const sortSmartItem = trackMenuItem(
    await MenuItem.new({
      id: 'sort-smart',
      text: withCheckmark(SORT_LABELS.smart, sortMode === 'smart'),
      enabled: isAppActionEnabled(),
      action: () => {
        emit(MENU_EVENTS.SORT_SMART);
      },
    }),
  );

  const sortPriorityItem = trackMenuItem(
    await MenuItem.new({
      id: 'sort-priority',
      text: withCheckmark(SORT_LABELS.priority, sortMode === 'priority'),
      enabled: isAppActionEnabled(),
      action: () => {
        emit(MENU_EVENTS.SORT_PRIORITY);
      },
    }),
  );

  const sortStartDateItem = trackMenuItem(
    await MenuItem.new({
      id: 'sort-start-date',
      text: withCheckmark(SORT_LABELS['start-date'], sortMode === 'start-date'),
      enabled: isAppActionEnabled(),
      action: () => {
        emit(MENU_EVENTS.SORT_START_DATE);
      },
    }),
  );

  const sortDueDateItem = trackMenuItem(
    await MenuItem.new({
      id: 'sort-due-date',
      text: withCheckmark(SORT_LABELS['due-date'], sortMode === 'due-date'),
      enabled: isAppActionEnabled(),
      action: () => {
        emit(MENU_EVENTS.SORT_DUE_DATE);
      },
    }),
  );

  const sortTitleItem = trackMenuItem(
    await MenuItem.new({
      id: 'sort-title',
      text: withCheckmark(SORT_LABELS.title, sortMode === 'title'),
      enabled: isAppActionEnabled(),
      action: () => {
        emit(MENU_EVENTS.SORT_TITLE);
      },
    }),
  );

  const sortCreatedItem = trackMenuItem(
    await MenuItem.new({
      id: 'sort-created',
      text: withCheckmark(SORT_LABELS.created, sortMode === 'created'),
      enabled: isAppActionEnabled(),
      action: () => {
        emit(MENU_EVENTS.SORT_CREATED);
      },
    }),
  );

  const sortModifiedItem = trackMenuItem(
    await MenuItem.new({
      id: 'sort-modified',
      text: withCheckmark(SORT_LABELS.modified, sortMode === 'modified'),
      enabled: isAppActionEnabled(),
      action: () => {
        emit(MENU_EVENTS.SORT_MODIFIED);
      },
    }),
  );

  const sortDirectionAscItem = trackMenuItem(
    await MenuItem.new({
      id: 'sort-direction-asc',
      text: withCheckmark('Ascending', sortDirection === 'asc'),
      enabled: isAppActionEnabled(sortMode !== 'manual'),
      action: () => {
        emit(MENU_EVENTS.SORT_DIRECTION_ASC);
      },
    }),
  );

  const sortDirectionDescItem = trackMenuItem(
    await MenuItem.new({
      id: 'sort-direction-desc',
      text: withCheckmark('Descending', sortDirection === 'desc'),
      enabled: isAppActionEnabled(sortMode !== 'manual'),
      action: () => {
        emit(MENU_EVENTS.SORT_DIRECTION_DESC);
      },
    }),
  );

  const sortDirectionSubmenu = trackMenuItem(
    await Submenu.new({
      id: 'sort-direction-submenu',
      text: 'Sort Direction',
      enabled: sortMode !== 'manual',
      items: [sortDirectionAscItem, sortDirectionDescItem],
    }),
  );

  const groupItems = await Promise.all(
    GROUP_MENU_OPTIONS.map(async (option) =>
      trackMenuItem(
        await MenuItem.new({
          id: option.id,
          text: withCheckmark(option.label, taskGroupMode === option.mode),
          enabled: isAppActionEnabled(isGroupModeEnabled(option.mode, activeCalendarId)),
          action: () => {
            emit(option.event);
          },
        }),
      ),
    ),
  );

  const groupDirectionEnabled = isGroupDirectionEnabled(taskGroupMode, activeCalendarId);

  const groupDirectionAscItem = trackMenuItem(
    await MenuItem.new({
      id: 'group-direction-asc',
      text: withCheckmark('Ascending', taskGroupDirection === 'asc'),
      enabled: isAppActionEnabled(groupDirectionEnabled),
      action: () => {
        emit(MENU_EVENTS.GROUP_DIRECTION_ASC);
      },
    }),
  );

  const groupDirectionDescItem = trackMenuItem(
    await MenuItem.new({
      id: 'group-direction-desc',
      text: withCheckmark('Descending', taskGroupDirection === 'desc'),
      enabled: isAppActionEnabled(groupDirectionEnabled),
      action: () => {
        emit(MENU_EVENTS.GROUP_DIRECTION_DESC);
      },
    }),
  );

  const groupDirectionSubmenu = trackMenuItem(
    await Submenu.new({
      id: 'group-direction-submenu',
      text: 'Group Direction',
      enabled: groupDirectionEnabled,
      items: [groupDirectionAscItem, groupDirectionDescItem],
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
      await Submenu.new({
        text: 'Sort By',
        items: [
          sortManualItem,
          sortSmartItem,
          sortPriorityItem,
          sortStartDateItem,
          sortDueDateItem,
          sortTitleItem,
          sortCreatedItem,
          sortModifiedItem,
        ],
      }),
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
