import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import {
  CheckMenuItem,
  type IconMenuItem,
  Menu,
  MenuItem,
  PredefinedMenuItem,
  Submenu,
} from '@tauri-apps/api/menu';
import { MENU_EVENTS } from '$constants/menu';
import { loggers } from '$lib/logger';
import type { KeyboardShortcut } from '$types/shortcuts';
import type { SortDirection, SortMode } from '$types/sort';
import { isMacPlatform } from '$utils/platform';

const log = loggers.menu;

// store menu item references for updates
const menuItemRefs: {
  sync?: MenuItem;
  toggleCompleted?: CheckMenuItem;
  toggleCompletedToBottom?: CheckMenuItem;
  toggleUnstarted?: CheckMenuItem;
  sortManual?: MenuItem;
  sortSmart?: MenuItem;
  sortStartDate?: MenuItem;
  sortDueDate?: MenuItem;
  sortPriority?: MenuItem;
  sortTitle?: MenuItem;
  sortCreated?: MenuItem;
  sortModified?: MenuItem;
  sortDirectionAsc?: MenuItem;
  sortDirectionDesc?: MenuItem;
  sortDirectionSubmenu?: Submenu;
  navPreviousList?: MenuItem;
  navNextList?: MenuItem;
} = {};

const modalMenuItems: Array<{
  item: MenuItem | CheckMenuItem | Submenu;
  normallyEnabled: boolean;
}> = [];
let modalMenuOpen = false;
let goSubmenuRef: Submenu | undefined;
let accountsSubmenuRef: Submenu | undefined;
const navigationMenuItems = new Map<string, CheckMenuItem>();
let submenuMutationQueue: Promise<void> = Promise.resolve();

const enqueueSubmenuMutation = (mutation: () => Promise<void>) => {
  const next = submenuMutationQueue.then(mutation, mutation);
  submenuMutationQueue = next.catch(() => {});
  return next;
};

const collectModalMenuItems = async (submenu: Submenu) => {
  for (const item of await submenu.items()) {
    if (item instanceof Submenu) {
      modalMenuItems.push({ item, normallyEnabled: await item.isEnabled() });
      await collectModalMenuItems(item);
    } else if (item instanceof MenuItem || item instanceof CheckMenuItem) {
      // these two actions remain available while a modal is open
      if (item.id === 'quit' || item.id === 'select-all') continue;
      modalMenuItems.push({ item, normallyEnabled: await item.isEnabled() });
    }
  }
};

const collectModalMenuItemIds = async (submenu: Submenu): Promise<Set<string>> => {
  const ids = new Set<string>();
  for (const item of await submenu.items()) {
    if (item instanceof Submenu) {
      ids.add(item.id);
      for (const id of await collectModalMenuItemIds(item)) ids.add(id);
    } else if (
      (item instanceof MenuItem || item instanceof CheckMenuItem) &&
      item.id !== 'quit' &&
      item.id !== 'select-all'
    ) {
      ids.add(item.id);
    }
  }
  return ids;
};

const closeMenuItemTree = async (
  item: Submenu | MenuItem | CheckMenuItem | IconMenuItem | PredefinedMenuItem,
) => {
  if (item instanceof Submenu) {
    for (const child of await item.items()) {
      await item.remove(child);
      await closeMenuItemTree(child);
    }
  }
  await item.close();
};

const replaceSubmenuContents = async (target: Submenu, replacement: Submenu) => {
  const oldIds = await collectModalMenuItemIds(target);
  for (let index = modalMenuItems.length - 1; index >= 0; index--) {
    if (oldIds.has(modalMenuItems[index].item.id)) modalMenuItems.splice(index, 1);
  }

  for (const item of await target.items()) {
    await target.remove(item);
    await closeMenuItemTree(item);
  }

  await collectModalMenuItems(replacement);
  for (const item of await replacement.items()) {
    await replacement.remove(item);
    await target.append(item);
  }
  await replacement.close();

  if (modalMenuOpen) {
    const newIds = await collectModalMenuItemIds(target);
    await Promise.all(
      modalMenuItems
        .filter(({ item }) => newIds.has(item.id))
        .map(({ item }) => item.setEnabled(false)),
    );
  }
};

const setModalMenuState = async (isOpen: boolean) => {
  if (isOpen === modalMenuOpen) return;
  modalMenuOpen = isOpen;
  await Promise.all(
    modalMenuItems.map(({ item, normallyEnabled }) => item.setEnabled(!isOpen && normallyEnabled)),
  );
};

/**
 * converts a KeyboardShortcut to Tauri accelerator format
 */
const shortcutToAccelerator = (shortcut?: KeyboardShortcut) => {
  if (!shortcut?.key) return undefined;
  if (shortcut.super) return undefined;

  const parts: string[] = [];

  if (shortcut.meta) parts.push('CmdOrCtrl');
  if (shortcut.ctrl && (isMacPlatform() || !shortcut.meta)) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');

  // map special keys
  const keyMap: Record<string, string> = {
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    ' ': 'Space',
  };
  const key = keyMap[shortcut.key] ?? shortcut.key.toUpperCase();
  parts.push(key);

  return parts.length > 0 ? parts.join('+') : undefined;
};

const getAcceleratorOrDefault = (
  shortcuts: KeyboardShortcut[] | undefined,
  id: string,
  defaultAccelerator: string,
) => {
  if (!shortcuts) return defaultAccelerator;

  const shortcut = shortcuts.find((s) => s.id === id);
  if (!shortcut) return defaultAccelerator;

  return shortcutToAccelerator(shortcut);
};

const isEnabledOutsideModal = (isModalOpen: boolean, enabled = true) => !isModalOpen && enabled;

/**
 * creates and sets the macOS application menu
 * only called on macOS
 */
interface MenuCalendar {
  id: string;
  displayName: string;
  accountId?: string;
}

interface MenuAccount {
  id: string;
  name: string;
  calendars?: MenuCalendar[];
}

interface DockMenuFilter {
  id: string;
  label: string;
}

interface MenuNavigationCalendar extends MenuCalendar {
  accountId: string;
}

interface MenuNavigationItem {
  id: string;
  label: string;
}

interface MenuNavigationOptions {
  filters?: MenuNavigationItem[];
  localCalendars?: MenuNavigationCalendar[];
  accountCalendars?: MenuAccount[];
  tags?: MenuNavigationItem[];
  activeListKey?: string;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
}

const createGoSubmenu = async ({
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
    if (calendarSubmenuItems.length > 0) {
      calendarSubmenuItems.push(await PredefinedMenuItem.new({ item: 'Separator' }));
    }
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
    destinationItems.push(await PredefinedMenuItem.new({ item: 'Separator' }));
    destinationItems.push(await Submenu.new({ text: 'Filters', items: filterItems }));
  }
  if (calendarSubmenuItems.length > 0) {
    destinationItems.push(await PredefinedMenuItem.new({ item: 'Separator' }));
    destinationItems.push(await Submenu.new({ text: 'Calendars', items: calendarSubmenuItems }));
  }
  if (tagItems.length > 0) {
    destinationItems.push(await PredefinedMenuItem.new({ item: 'Separator' }));
    destinationItems.push(await Submenu.new({ text: 'Tags', items: tagItems }));
  }

  const previousListItem = await MenuItem.new({
    id: 'nav-prev-list',
    text: 'Previous List',
    accelerator: getAcceleratorOrDefault(shortcuts, 'nav-prev-list', 'CmdOrCtrl+['),
    enabled: isAppActionEnabled(canGoPrevious),
    action: () => {
      emit(MENU_EVENTS.NAV_PREV_LIST);
    },
  });
  const nextListItem = await MenuItem.new({
    id: 'nav-next-list',
    text: 'Next List',
    accelerator: getAcceleratorOrDefault(shortcuts, 'nav-next-list', 'CmdOrCtrl+]'),
    enabled: isAppActionEnabled(canGoNext),
    action: () => {
      emit(MENU_EVENTS.NAV_NEXT_LIST);
    },
  });
  menuItemRefs.navPreviousList = previousListItem;
  menuItemRefs.navNextList = nextListItem;

  return Submenu.new({
    text: 'Go',
    items: [
      previousListItem,
      nextListItem,
      await PredefinedMenuItem.new({ item: 'Separator' }),
      ...destinationItems,
    ],
  });
};

const createAccountsSubmenu = async ({
  accounts,
  shortcuts,
  caldavAccountCount,
  isSyncing,
  isModalOpen,
}: {
  accounts: MenuAccount[];
  shortcuts?: KeyboardShortcut[];
  caldavAccountCount: number;
  isSyncing: boolean;
  isModalOpen: boolean;
}) => {
  const isAppActionEnabled = (enabled = true) => isEnabledOutsideModal(isModalOpen, enabled);
  const syncItem = await MenuItem.new({
    id: 'sync',
    text: 'Sync',
    accelerator: getAcceleratorOrDefault(shortcuts, 'sync', 'CmdOrCtrl+R'),
    enabled: isAppActionEnabled(caldavAccountCount > 0 && !isSyncing),
    action: () => {
      emit(MENU_EVENTS.SYNC);
    },
  });
  menuItemRefs.sync = syncItem;

  const accountSubmenus = await Promise.all(
    accounts.map(async (account) => {
      const calendars = account.calendars ?? [];
      const calendarSubmenus = await Promise.all(
        calendars.map(async (calendar) =>
          Submenu.new({
            text: calendar.displayName,
            items: [
              await MenuItem.new({
                text: 'Sync',
                enabled: isAppActionEnabled(),
                action: () => {
                  emit(MENU_EVENTS.SYNC_CALENDAR, {
                    calendarId: calendar.id,
                    accountId: account.id,
                  });
                },
              }),
              await MenuItem.new({
                text: 'Edit Calendar',
                enabled: isAppActionEnabled(),
                action: () => {
                  emit(MENU_EVENTS.EDIT_CALENDAR, {
                    calendarId: calendar.id,
                    accountId: account.id,
                  });
                },
              }),
              await MenuItem.new({
                text: 'Export Tasks',
                enabled: isAppActionEnabled(),
                action: () => {
                  emit(MENU_EVENTS.EXPORT_CALENDAR, {
                    calendarId: calendar.id,
                    accountId: account.id,
                  });
                },
              }),
              await PredefinedMenuItem.new({ item: 'Separator' }),
              await MenuItem.new({
                text: 'Delete Calendar',
                enabled: isAppActionEnabled(),
                action: () => {
                  emit(MENU_EVENTS.DELETE_CALENDAR, {
                    calendarId: calendar.id,
                    accountId: account.id,
                  });
                },
              }),
            ],
          }),
        ),
      );

      const calendarItems: (Submenu | MenuItem | PredefinedMenuItem)[] =
        calendars.length > 0
          ? [
              await Submenu.new({ text: 'Calendars', items: calendarSubmenus }),
              await PredefinedMenuItem.new({ item: 'Separator' }),
            ]
          : [];

      return Submenu.new({
        text: account.name,
        items: [
          ...calendarItems,
          await MenuItem.new({
            text: 'New Calendar...',
            enabled: isAppActionEnabled(),
            action: () => {
              emit(MENU_EVENTS.ADD_CALENDAR, { accountId: account.id });
            },
          }),
          await MenuItem.new({
            text: 'Edit Account',
            enabled: isAppActionEnabled(),
            action: () => {
              emit(MENU_EVENTS.EDIT_ACCOUNT, { accountId: account.id });
            },
          }),
          await MenuItem.new({
            text: 'Remove Account',
            enabled: isAppActionEnabled(),
            action: () => {
              emit(MENU_EVENTS.REMOVE_ACCOUNT, { accountId: account.id });
            },
          }),
        ],
      });
    }),
  );

  const accountItems: (Submenu | MenuItem | PredefinedMenuItem)[] =
    accounts.length > 0
      ? [...accountSubmenus, await PredefinedMenuItem.new({ item: 'Separator' })]
      : [
          await MenuItem.new({
            id: 'no-accounts-added',
            text: 'No accounts added...',
            enabled: false,
          }),
          await PredefinedMenuItem.new({ item: 'Separator' }),
        ];

  return Submenu.new({
    text: 'Accounts',
    items: [
      syncItem,
      await PredefinedMenuItem.new({ item: 'Separator' }),
      ...accountItems,
      await MenuItem.new({
        id: 'add-account',
        text: 'Add Account...',
        enabled: isAppActionEnabled(),
        action: () => {
          emit(MENU_EVENTS.ADD_ACCOUNT);
        },
      }),
    ],
  });
};

export const createMacMenu = async (options?: {
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
}) => {
  const showCompleted = options?.showCompleted ?? true;
  const moveCompletedTasksToBottom = options?.moveCompletedTasksToBottom ?? false;
  const showUnstarted = options?.showUnstarted ?? true;
  const sortMode = options?.sortMode ?? 'manual';
  const sortDirection = options?.sortDirection ?? 'asc';
  const shortcuts = options?.shortcuts;
  const accounts = options?.accounts ?? [];
  const isSyncing = options?.isSyncing ?? false;
  const navigation = options?.navigation;
  const isAppActionEnabled = (enabled = true) =>
    isEnabledOutsideModal(options?.isModalOpen ?? false, enabled);

  // app menu (Chiri)
  const appSubmenu = await Submenu.new({
    text: 'Chiri',
    items: [
      await MenuItem.new({
        id: 'about',
        text: 'About Chiri',
        enabled: isAppActionEnabled(),
        action: () => {
          emit(MENU_EVENTS.ABOUT);
        },
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({
        id: 'preferences',
        text: 'Settings...',
        accelerator: getAcceleratorOrDefault(shortcuts, 'settings', 'CmdOrCtrl+,'),
        enabled: isAppActionEnabled(),
        action: () => {
          emit(MENU_EVENTS.PREFERENCES);
        },
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({
        text: 'Services',
        item: 'Services',
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({
        text: 'Hide Chiri',
        item: 'Hide',
      }),
      await PredefinedMenuItem.new({
        text: 'Hide Others',
        item: 'HideOthers',
      }),
      await PredefinedMenuItem.new({
        text: 'Show All',
        item: 'ShowAll',
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({
        id: 'quit',
        text: 'Quit Chiri',
        accelerator: 'CmdOrCtrl+Q',
        action: () => {
          emit(MENU_EVENTS.QUIT_MENU);
        },
      }),
    ],
  });

  // file menu
  const fileSubmenu = await Submenu.new({
    text: 'File',
    items: [
      await MenuItem.new({
        id: 'new-task',
        text: 'New Task',
        accelerator: getAcceleratorOrDefault(shortcuts, 'new-task', 'CmdOrCtrl+N'),
        enabled: isAppActionEnabled(),
        action: () => {
          emit(MENU_EVENTS.NEW_TASK);
        },
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({
        id: 'import',
        text: 'Import Tasks...',
        accelerator: getAcceleratorOrDefault(shortcuts, 'import-tasks', 'CmdOrCtrl+I'),
        enabled: isAppActionEnabled(),
        action: () => {
          emit(MENU_EVENTS.IMPORT_TASKS);
        },
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({
        text: 'Close Window',
        item: 'CloseWindow',
      }),
    ],
  });

  // edit menu
  const editSubmenu = await Submenu.new({
    text: 'Edit',
    items: [
      await PredefinedMenuItem.new({
        text: 'Undo',
        item: 'Undo',
      }),
      await PredefinedMenuItem.new({
        text: 'Redo',
        item: 'Redo',
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({
        text: 'Cut',
        item: 'Cut',
      }),
      await PredefinedMenuItem.new({
        text: 'Copy',
        item: 'Copy',
      }),
      await PredefinedMenuItem.new({
        text: 'Paste',
        item: 'Paste',
      }),
      await MenuItem.new({
        id: 'select-all',
        text: 'Select All',
        accelerator: getAcceleratorOrDefault(shortcuts, 'select-all-tasks', 'CmdOrCtrl+A'),
        enabled: true,
        action: () => {
          const active = document.activeElement as HTMLElement | null;
          if (
            active &&
            (active.tagName === 'INPUT' ||
              active.tagName === 'TEXTAREA' ||
              active.isContentEditable)
          ) {
            if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
              active.select();
            } else {
              const selection = window.getSelection();
              if (selection) {
                const range = document.createRange();
                range.selectNodeContents(active);
                selection.removeAllRanges();
                selection.addRange(range);
              }
            }
            return;
          }
          emit(MENU_EVENTS.SELECT_ALL);
        },
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({
        id: 'search',
        text: 'Search Tasks...',
        accelerator: getAcceleratorOrDefault(shortcuts, 'search', 'CmdOrCtrl+F'),
        enabled: isAppActionEnabled(),
        action: () => {
          emit(MENU_EVENTS.SEARCH);
        },
      }),
    ],
  });

  // view menu
  const toggleCompletedItem = await CheckMenuItem.new({
    id: 'toggle-completed',
    text: 'Show Completed Tasks',
    accelerator: getAcceleratorOrDefault(shortcuts, 'toggle-show-completed', 'CmdOrCtrl+Shift+H'),
    checked: showCompleted,
    enabled: isAppActionEnabled(),
    action: () => {
      emit(MENU_EVENTS.TOGGLE_COMPLETED);
    },
  });
  menuItemRefs.toggleCompleted = toggleCompletedItem;

  const toggleCompletedToBottomItem = await CheckMenuItem.new({
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
  });
  menuItemRefs.toggleCompletedToBottom = toggleCompletedToBottomItem;

  const toggleUnstartedItem = await CheckMenuItem.new({
    id: 'toggle-unstarted',
    text: 'Show Unstarted Tasks',
    accelerator: getAcceleratorOrDefault(shortcuts, 'toggle-show-unstarted', 'CmdOrCtrl+U'),
    checked: showUnstarted,
    enabled: isAppActionEnabled(),
    action: () => {
      emit(MENU_EVENTS.TOGGLE_UNSTARTED);
    },
  });
  menuItemRefs.toggleUnstarted = toggleUnstartedItem;

  const sortManualItem = await MenuItem.new({
    id: 'sort-manual',
    text: sortMode === 'manual' ? '✓ Manual' : 'Manual',
    enabled: isAppActionEnabled(),
    action: () => {
      emit(MENU_EVENTS.SORT_MANUAL);
    },
  });
  menuItemRefs.sortManual = sortManualItem;

  const sortSmartItem = await MenuItem.new({
    id: 'sort-smart',
    text: sortMode === 'smart' ? '✓ Smart Sort' : 'Smart Sort',
    enabled: isAppActionEnabled(),
    action: () => {
      emit(MENU_EVENTS.SORT_SMART);
    },
  });
  menuItemRefs.sortSmart = sortSmartItem;

  const sortPriorityItem = await MenuItem.new({
    id: 'sort-priority',
    text: sortMode === 'priority' ? '✓ Priority' : 'Priority',
    enabled: isAppActionEnabled(),
    action: () => {
      emit(MENU_EVENTS.SORT_PRIORITY);
    },
  });
  menuItemRefs.sortPriority = sortPriorityItem;

  const sortStartDateItem = await MenuItem.new({
    id: 'sort-start-date',
    text: sortMode === 'start-date' ? '✓ Start Date' : 'Start Date',
    enabled: isAppActionEnabled(),
    action: () => {
      emit(MENU_EVENTS.SORT_START_DATE);
    },
  });
  menuItemRefs.sortStartDate = sortStartDateItem;

  const sortDueDateItem = await MenuItem.new({
    id: 'sort-due-date',
    text: sortMode === 'due-date' ? '✓ Due Date' : 'Due Date',
    enabled: isAppActionEnabled(),
    action: () => {
      emit(MENU_EVENTS.SORT_DUE_DATE);
    },
  });
  menuItemRefs.sortDueDate = sortDueDateItem;

  const sortTitleItem = await MenuItem.new({
    id: 'sort-title',
    text: sortMode === 'title' ? '✓ Title' : 'Title',
    enabled: isAppActionEnabled(),
    action: () => {
      emit(MENU_EVENTS.SORT_TITLE);
    },
  });
  menuItemRefs.sortTitle = sortTitleItem;

  const sortCreatedItem = await MenuItem.new({
    id: 'sort-created',
    text: sortMode === 'created' ? '✓ Date Created' : 'Date Created',
    enabled: isAppActionEnabled(),
    action: () => {
      emit(MENU_EVENTS.SORT_CREATED);
    },
  });
  menuItemRefs.sortCreated = sortCreatedItem;

  const sortModifiedItem = await MenuItem.new({
    id: 'sort-modified',
    text: sortMode === 'modified' ? '✓ Date Modified' : 'Date Modified',
    enabled: isAppActionEnabled(),
    action: () => {
      emit(MENU_EVENTS.SORT_MODIFIED);
    },
  });
  menuItemRefs.sortModified = sortModifiedItem;

  const sortDirectionAscItem = await MenuItem.new({
    id: 'sort-direction-asc',
    text: sortDirection === 'asc' ? '✓ Ascending' : 'Ascending',
    enabled: isAppActionEnabled(sortMode !== 'manual'),
    action: () => {
      emit(MENU_EVENTS.SORT_DIRECTION_ASC);
    },
  });
  menuItemRefs.sortDirectionAsc = sortDirectionAscItem;

  const sortDirectionDescItem = await MenuItem.new({
    id: 'sort-direction-desc',
    text: sortDirection === 'desc' ? '✓ Descending' : 'Descending',
    enabled: isAppActionEnabled(sortMode !== 'manual'),
    action: () => {
      emit(MENU_EVENTS.SORT_DIRECTION_DESC);
    },
  });
  menuItemRefs.sortDirectionDesc = sortDirectionDescItem;

  const sortDirectionSubmenu = await Submenu.new({
    id: 'sort-direction-submenu',
    text: 'Sort Direction',
    enabled: sortMode !== 'manual',
    items: [sortDirectionAscItem, sortDirectionDescItem],
  });
  menuItemRefs.sortDirectionSubmenu = sortDirectionSubmenu;

  const viewSubmenu = await Submenu.new({
    text: 'View',
    items: [
      toggleCompletedItem,
      toggleUnstartedItem,
      toggleCompletedToBottomItem,
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await Submenu.new({
        text: 'Sort By',
        items: [
          sortManualItem,
          sortSmartItem,
          await PredefinedMenuItem.new({ item: 'Separator' }),
          sortPriorityItem,
          sortStartDateItem,
          sortDueDateItem,
          await PredefinedMenuItem.new({ item: 'Separator' }),
          sortTitleItem,
          sortCreatedItem,
          sortModifiedItem,
        ],
      }),
      sortDirectionSubmenu,
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({
        id: 'toggle-sidebar',
        text: 'Toggle Sidebar',
        accelerator: getAcceleratorOrDefault(shortcuts, 'toggle-sidebar', 'CmdOrCtrl+E'),
        enabled: isAppActionEnabled(),
        action: () => {
          emit(MENU_EVENTS.TOGGLE_SIDEBAR);
        },
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({
        text: 'Enter Full Screen',
        item: 'Fullscreen',
      }),
    ],
  });

  const accountsSubmenu = await createAccountsSubmenu({
    accounts,
    shortcuts,
    caldavAccountCount: options?.caldavAccountCount ?? accounts.length,
    isSyncing,
    isModalOpen: options?.isModalOpen ?? false,
  });

  const goSubmenu = await createGoSubmenu({
    navigation,
    shortcuts,
    isModalOpen: options?.isModalOpen ?? false,
  });

  // window menu
  const windowSubmenu = await Submenu.new({
    text: 'Window',
    items: [
      await PredefinedMenuItem.new({
        text: 'Minimize',
        item: 'Minimize',
      }),
      await PredefinedMenuItem.new({
        text: 'Zoom',
        item: 'Maximize',
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({
        text: 'Bring All to Front',
        item: 'BringAllToFront',
      }),
    ],
  });

  // help submenu
  const helpSubmenu = await Submenu.new({
    text: 'Help',
    items: [
      await MenuItem.new({
        id: 'keyboard-shortcuts',
        text: 'Keyboard Shortcuts',
        accelerator: getAcceleratorOrDefault(shortcuts, 'keyboard-shortcuts', 'CmdOrCtrl+/'),
        enabled: isAppActionEnabled(),
        action: () => {
          emit(MENU_EVENTS.SHOW_KEYBOARD_SHORTCUTS);
        },
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({
        id: 'whats-new',
        text: "What's New",
        enabled: isAppActionEnabled(),
        action: () => {
          emit(MENU_EVENTS.SHOW_CHANGELOG);
        },
      }),
      await MenuItem.new({
        id: 'check-for-updates',
        text: 'Check for Updates',
        enabled: isAppActionEnabled(),
        action: () => {
          emit(MENU_EVENTS.CHECK_FOR_UPDATES);
        },
      }),
    ],
  });

  // create the main menu
  const menu = await Menu.new({
    items: [
      appSubmenu,
      fileSubmenu,
      editSubmenu,
      viewSubmenu,
      accountsSubmenu,
      goSubmenu,
      windowSubmenu,
      helpSubmenu,
    ],
  });

  return { menu, windowSubmenu, goSubmenu, accountsSubmenu };
};

/**
 * initializes the application menu
 * should be called during app bootstrap
 */
export const initAppMenu = async (options?: {
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
}) => {
  // only create menu on macOS
  if (!isMacPlatform()) return;

  try {
    const shouldApplyModalState = options?.isModalOpen ?? modalMenuOpen;
    const { menu, windowSubmenu, goSubmenu, accountsSubmenu } = await createMacMenu({
      ...options,
      isModalOpen: false,
    });
    await menu.setAsAppMenu();
    goSubmenuRef = goSubmenu;
    accountsSubmenuRef = accountsSubmenu;
    modalMenuItems.length = 0;
    modalMenuOpen = false;
    for (const item of await menu.items()) {
      if (item instanceof Submenu) await collectModalMenuItems(item);
    }
    if (shouldApplyModalState) await setModalMenuState(true);
    await windowSubmenu.setAsWindowsMenuForNSApp();
    // fix macOS Help menu search bar; muda's setAsHelpMenuForNSApp() is broken,
    // so we call NSApp.setHelpMenu() directly from Rust after the menu is live
    await invoke('apply_macos_menu_fixes').catch(() => {});
  } catch (error) {
    log.error('Failed to initialize menu:', error);
  }
};

export const updateDockMenu = async (options: {
  filters: DockMenuFilter[];
  syncEnabled: boolean;
  isModalOpen?: boolean;
}) => {
  if (!isMacPlatform()) return;

  try {
    await invoke('update_macos_dock_menu', options);
  } catch (error) {
    log.error('Failed to update Dock menu:', error);
  }
};

/**
 * rebuilds the app menu with new shortcuts
 * call this when keyboard shortcuts are changed in settings
 */
export const rebuildAppMenu = async (options?: {
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
}) => {
  await enqueueSubmenuMutation(() => initAppMenu(options));
};

/**
 * refreshes the Go submenu in place so navigation changes don't replace NSApp's menu
 */
export const updateGoMenu = async (options: {
  shortcuts?: KeyboardShortcut[];
  navigation?: MenuNavigationOptions;
}) => {
  if (!isMacPlatform()) return;

  try {
    await enqueueSubmenuMutation(async () => {
      const target = goSubmenuRef;
      if (!target) return;

      const replacement = await createGoSubmenu({
        navigation: options.navigation,
        shortcuts: options.shortcuts,
        isModalOpen: false,
      });
      await replaceSubmenuContents(target, replacement);
    });
  } catch (error) {
    log.error('Failed to update Go menu:', error);
  }
};

/**
 * refreshes account and calendar actions without replacing the application menu
 */
export const updateAccountsMenu = async (options: {
  accounts: MenuAccount[];
  shortcuts?: KeyboardShortcut[];
  caldavAccountCount: number;
  isSyncing?: boolean;
}) => {
  if (!isMacPlatform()) return;

  try {
    await enqueueSubmenuMutation(async () => {
      const target = accountsSubmenuRef;
      if (!target) return;

      const replacement = await createAccountsSubmenu({
        accounts: options.accounts,
        shortcuts: options.shortcuts,
        caldavAccountCount: options.caldavAccountCount,
        isSyncing: options.isSyncing ?? false,
        isModalOpen: false,
      });
      await replaceSubmenuContents(target, replacement);
    });
  } catch (error) {
    log.error('Failed to update Accounts menu:', error);
  }
};

/**
 * updates a specific menu item's state
 */
export const updateMenuItem = async (
  menuId: string,
  updates: {
    text?: string;
    enabled?: boolean;
    checked?: boolean;
  },
) => {
  try {
    // use stored references instead of searching the menu
    let item: MenuItem | IconMenuItem | CheckMenuItem | Submenu | undefined;

    switch (menuId) {
      case 'sync':
        item = menuItemRefs.sync;
        break;
      case 'toggle-completed':
        item = menuItemRefs.toggleCompleted;
        break;
      case 'toggle-completed-to-bottom':
        item = menuItemRefs.toggleCompletedToBottom;
        break;
      case 'sort-manual':
        item = menuItemRefs.sortManual;
        break;
      case 'sort-smart':
        item = menuItemRefs.sortSmart;
        break;
      case 'sort-start-date':
        item = menuItemRefs.sortStartDate;
        break;
      case 'sort-due-date':
        item = menuItemRefs.sortDueDate;
        break;
      case 'sort-priority':
        item = menuItemRefs.sortPriority;
        break;
      case 'sort-title':
        item = menuItemRefs.sortTitle;
        break;
      case 'sort-created':
        item = menuItemRefs.sortCreated;
        break;
      case 'sort-modified':
        item = menuItemRefs.sortModified;
        break;
      case 'sort-direction-asc':
        item = menuItemRefs.sortDirectionAsc;
        break;
      case 'sort-direction-desc':
        item = menuItemRefs.sortDirectionDesc;
        break;
      case 'sort-direction-submenu':
        item = menuItemRefs.sortDirectionSubmenu;
        break;
      case 'nav-prev-list':
        item = menuItemRefs.navPreviousList;
        break;
      case 'nav-next-list':
        item = menuItemRefs.navNextList;
        break;
    }

    if (!item) return;

    if (updates.text !== undefined && 'setText' in item) {
      await item.setText(updates.text);
    }

    if (updates.enabled !== undefined && 'setEnabled' in item) {
      const modalManagedItem = modalMenuItems.find((entry) => entry.item.id === menuId);
      if (modalManagedItem) {
        modalManagedItem.normallyEnabled = updates.enabled;
        await item.setEnabled(!modalMenuOpen && updates.enabled);
      } else {
        await item.setEnabled(updates.enabled);
      }
    }

    if (updates.checked !== undefined && 'setChecked' in item) {
      await item.setChecked(updates.checked);
    }
  } catch (error) {
    log.error(`Failed to update menu item "${menuId}":`, error);
  }
};

/**
 * updates the menu state based on app state
 */
export const updateMenuState = async (options: {
  accountCount?: number;
  showCompleted?: boolean;
  moveCompletedTasksToBottom?: boolean;
  showUnstarted?: boolean;
  sortMode?: SortMode;
  sortDirection?: SortDirection;
  isSyncing?: boolean;
  isModalOpen?: boolean;
  activeListKey?: string;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
}) => {
  if (options.isModalOpen === true) await setModalMenuState(true);
  // modal enablement is applied as an overlay by the registered menu items
  // keep these updates as the underlying enabled state

  if (options.accountCount !== undefined || options.isSyncing !== undefined) {
    const hasAccounts = (options.accountCount ?? 1) > 0;
    const isSyncing = options.isSyncing ?? false;
    await updateMenuItem('sync', { enabled: hasAccounts && !isSyncing });
  }
  if (options.showCompleted !== undefined) {
    await updateMenuItem('toggle-completed', { checked: options.showCompleted });
    await updateMenuItem('toggle-completed-to-bottom', {
      enabled: options.showCompleted,
    });
  }
  if (options.moveCompletedTasksToBottom !== undefined) {
    await updateMenuItem('toggle-completed-to-bottom', {
      checked: options.moveCompletedTasksToBottom,
    });
  }
  if (options.showUnstarted !== undefined) {
    await updateMenuItem('toggle-unstarted', { checked: options.showUnstarted });
  }
  if (options.activeListKey !== undefined) {
    await Promise.all(
      [...navigationMenuItems.entries()].map(([listKey, item]) =>
        item.setChecked(listKey === options.activeListKey),
      ),
    );
  }
  if (options.canGoPrevious !== undefined) {
    await updateMenuItem('nav-prev-list', { enabled: options.canGoPrevious });
  }
  if (options.canGoNext !== undefined) {
    await updateMenuItem('nav-next-list', { enabled: options.canGoNext });
  }
  if (options.sortMode !== undefined) {
    // update sort menu items with checkmarks in text (radio button behavior)
    const sortOptions: Record<string, string> = {
      manual: 'Manual',
      smart: 'Smart Sort',
      priority: 'Priority',
      'start-date': 'Start Date',
      'due-date': 'Due Date',
      title: 'Title',
      created: 'Date Created',
      modified: 'Date Modified',
    };

    for (const [mode, label] of Object.entries(sortOptions)) {
      const hasCheck = mode === options.sortMode;
      await updateMenuItem(`sort-${mode}`, {
        text: hasCheck ? `✓ ${label}` : label,
      });
    }

    // enable/disable sort direction submenu and items based on sort mode
    const directionSubmenuEnabled = options.sortMode !== 'manual';
    await updateMenuItem('sort-direction-submenu', { enabled: directionSubmenuEnabled });
    await updateMenuItem('sort-direction-asc', { enabled: directionSubmenuEnabled });
    await updateMenuItem('sort-direction-desc', { enabled: directionSubmenuEnabled });
  }
  if (options.sortDirection !== undefined) {
    await updateMenuItem('sort-direction-asc', {
      text: options.sortDirection === 'asc' ? '✓ Ascending' : 'Ascending',
    });
    await updateMenuItem('sort-direction-desc', {
      text: options.sortDirection === 'desc' ? '✓ Descending' : 'Descending',
    });
  }
  if (options.isModalOpen === false) await setModalMenuState(false);
};
