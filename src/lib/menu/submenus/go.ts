import { emit } from '@tauri-apps/api/event';
import { CheckMenuItem, MenuItem, type PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu';
import { MENU_EVENTS } from '$constants/menu';
import { getAcceleratorOrDefault } from '$lib/menu/accelerators';
import { separator } from '$lib/menu/items';
import { isEnabledOutsideModal } from '$lib/menu/modal';
import { navigationMenuItems, trackMenuItem } from '$lib/menu/state';
import type { MenuNavigationOptions } from '$lib/menu/types';
import type { KeyboardShortcut } from '$types/shortcuts';

export const createGoSubmenu = async ({
  navigation,
  shortcuts,
  isModalOpen,
}: {
  navigation?: MenuNavigationOptions;
  shortcuts?: KeyboardShortcut[];
  isModalOpen: boolean;
}) => {
  navigationMenuItems.clear();
  const activeListKey = navigation?.activeListKey ?? 'all';
  const canGoPrevious = navigation?.canGoPrevious ?? false;
  const canGoNext = navigation?.canGoNext ?? false;
  const isAppActionEnabled = (enabled = true) => isEnabledOutsideModal(isModalOpen, enabled);

  const createGoDestinationItem = async ({
    id,
    text,
    listKey,
    action,
  }: {
    id: string;
    text: string;
    listKey: string;
    action: () => void;
  }) => {
    const item = await CheckMenuItem.new({
      id,
      text,
      checked: activeListKey === listKey,
      enabled: isAppActionEnabled(),
      action,
    });
    navigationMenuItems.set(listKey, item);
    return item;
  };

  const allTasksItem = await createGoDestinationItem({
    id: 'go-all-tasks',
    text: 'All Tasks',
    listKey: 'all',
    action: () => {
      emit(MENU_EVENTS.ALL_TASKS);
    },
  });

  const recentlyDeletedItem = await createGoDestinationItem({
    id: 'go-recently-deleted',
    text: 'Recently Deleted',
    listKey: 'recently-deleted',
    action: () => {
      emit(MENU_EVENTS.RECENTLY_DELETED);
    },
  });

  const filterItems = await Promise.all(
    (navigation?.filters ?? []).map((filter) =>
      createGoDestinationItem({
        id: `go-filter-${filter.id}`,
        text: filter.label,
        listKey: `filter:${filter.id}`,
        action: () => {
          emit(MENU_EVENTS.SELECT_FILTER, { filterId: filter.id });
        },
      }),
    ),
  );

  const localCalendarItems = await Promise.all(
    (navigation?.localCalendars ?? []).map((calendar) =>
      createGoDestinationItem({
        id: `go-calendar-${calendar.id}`,
        text: calendar.displayName,
        listKey: `calendar:${calendar.id}`,
        action: () => {
          emit(MENU_EVENTS.SELECT_CALENDAR, {
            accountId: calendar.accountId,
            calendarId: calendar.id,
          });
        },
      }),
    ),
  );

  const accountCalendarSubmenus = await Promise.all(
    (navigation?.accountCalendars ?? [])
      .filter((account) => (account.calendars?.length ?? 0) > 0)
      .map(async (account) =>
        Submenu.new({
          text: account.name,
          items: await Promise.all(
            (account.calendars ?? []).map((calendar) =>
              createGoDestinationItem({
                id: `go-calendar-${calendar.id}`,
                text: calendar.displayName,
                listKey: `calendar:${calendar.id}`,
                action: () => {
                  emit(MENU_EVENTS.SELECT_CALENDAR, {
                    accountId: account.id,
                    calendarId: calendar.id,
                  });
                },
              }),
            ),
          ),
        }),
      ),
  );

  const calendarSubmenuItems: Array<Submenu | PredefinedMenuItem> = [];
  if (localCalendarItems.length > 0) {
    calendarSubmenuItems.push(await Submenu.new({ text: 'Local', items: localCalendarItems }));
  }
  if (accountCalendarSubmenus.length > 0) {
    if (calendarSubmenuItems.length > 0) calendarSubmenuItems.push(await separator());
    calendarSubmenuItems.push(...accountCalendarSubmenus);
  }

  const tagItems = await Promise.all(
    (navigation?.tags ?? []).map((tag) =>
      createGoDestinationItem({
        id: `go-tag-${tag.id}`,
        text: tag.label,
        listKey: `tag:${tag.id}`,
        action: () => {
          emit(MENU_EVENTS.SELECT_TAG, { tagId: tag.id });
        },
      }),
    ),
  );

  const viewsHeaderItem = await MenuItem.new({
    id: 'go-views-header',
    text: 'Views',
    enabled: false,
  });

  const destinationItems: Array<Submenu | MenuItem | CheckMenuItem | PredefinedMenuItem> = [
    viewsHeaderItem,
    allTasksItem,
    recentlyDeletedItem,
  ];
  if (filterItems.length > 0) {
    destinationItems.push(await separator());
    destinationItems.push(await Submenu.new({ text: 'Filters', items: filterItems }));
  }
  if (calendarSubmenuItems.length > 0) {
    destinationItems.push(await separator());
    destinationItems.push(await Submenu.new({ text: 'Calendars', items: calendarSubmenuItems }));
  }
  if (tagItems.length > 0) {
    destinationItems.push(await separator());
    destinationItems.push(await Submenu.new({ text: 'Tags', items: tagItems }));
  }

  const previousListItem = trackMenuItem(
    await MenuItem.new({
      id: 'nav-prev-list',
      text: 'Previous List',
      accelerator: getAcceleratorOrDefault(shortcuts, 'nav-prev-list', 'CmdOrCtrl+['),
      enabled: isAppActionEnabled(canGoPrevious),
      action: () => {
        emit(MENU_EVENTS.NAV_PREV_LIST);
      },
    }),
  );
  const nextListItem = trackMenuItem(
    await MenuItem.new({
      id: 'nav-next-list',
      text: 'Next List',
      accelerator: getAcceleratorOrDefault(shortcuts, 'nav-next-list', 'CmdOrCtrl+]'),
      enabled: isAppActionEnabled(canGoNext),
      action: () => {
        emit(MENU_EVENTS.NAV_NEXT_LIST);
      },
    }),
  );

  return Submenu.new({
    text: 'Go',
    items: [previousListItem, nextListItem, await separator(), ...destinationItems],
  });
};
