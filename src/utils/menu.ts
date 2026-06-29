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
import type { KeyboardShortcut } from '$types';
import type { SortDirection, SortMode } from '$types/sort';
import { isMacPlatform } from '$utils/platform';

const log = loggers.menu;

// store menu item references for updates
const menuItemRefs: {
  sync?: MenuItem;
  deleteTask?: MenuItem;
  toggleCompleted?: CheckMenuItem;
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
} = {};

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

export const createMacMenu = async (options?: {
  showCompleted?: boolean;
  showUnstarted?: boolean;
  sortMode?: SortMode;
  sortDirection?: SortDirection;
  shortcuts?: KeyboardShortcut[];
  accounts?: MenuAccount[];
  caldavAccountCount?: number;
  isSyncing?: boolean;
  isEditorOpen?: boolean;
  isModalOpen?: boolean;
}) => {
  const showCompleted = options?.showCompleted ?? true;
  const showUnstarted = options?.showUnstarted ?? true;
  const sortMode = options?.sortMode ?? 'manual';
  const sortDirection = options?.sortDirection ?? 'asc';
  const shortcuts = options?.shortcuts;
  const accounts = options?.accounts ?? [];
  const hasAccounts = accounts.length > 0;
  const hasCaldavAccounts = (options?.caldavAccountCount ?? accounts.length) > 0;
  const isSyncing = options?.isSyncing ?? false;
  const isEditorOpen = options?.isEditorOpen ?? false;
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
      await PredefinedMenuItem.new({
        text: 'Select All',
        item: 'SelectAll',
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
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await (async () => {
        const item = await MenuItem.new({
          id: 'delete-task',
          text: 'Delete Task',
          accelerator: getAcceleratorOrDefault(shortcuts, 'delete', 'CmdOrCtrl+Backspace'),
          enabled: isAppActionEnabled(isEditorOpen),
          action: () => {
            emit(MENU_EVENTS.DELETE_TASK);
          },
        });
        menuItemRefs.deleteTask = item;
        return item;
      })(),
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

  // accounts menu (CalDAV accounts and calendars)
  const syncItem = await MenuItem.new({
    id: 'sync',
    text: 'Sync',
    accelerator: getAcceleratorOrDefault(shortcuts, 'sync', 'CmdOrCtrl+R'),
    enabled: isAppActionEnabled(hasCaldavAccounts && !isSyncing),
    action: () => {
      emit(MENU_EVENTS.SYNC);
    },
  });
  menuItemRefs.sync = syncItem;

  // one submenu per account with account-scoped actions
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

  const accountItems: (Submenu | MenuItem | PredefinedMenuItem)[] = hasAccounts
    ? [...accountSubmenus, await PredefinedMenuItem.new({ item: 'Separator' })]
    : [
        await MenuItem.new({
          id: 'no-accounts-added',
          text: 'No accounts added...',
          enabled: false,
        }),
        await PredefinedMenuItem.new({ item: 'Separator' }),
      ];

  const accountsSubmenu = await Submenu.new({
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

  // go menu (list navigation)
  const goSubmenu = await Submenu.new({
    text: 'Go',
    items: [
      await MenuItem.new({
        id: 'nav-prev-list',
        text: 'Previous List',
        accelerator: getAcceleratorOrDefault(shortcuts, 'nav-prev-list', 'CmdOrCtrl+['),
        enabled: isAppActionEnabled(),
        action: () => {
          emit(MENU_EVENTS.NAV_PREV_LIST);
        },
      }),
      await MenuItem.new({
        id: 'nav-next-list',
        text: 'Next List',
        accelerator: getAcceleratorOrDefault(shortcuts, 'nav-next-list', 'CmdOrCtrl+]'),
        enabled: isAppActionEnabled(),
        action: () => {
          emit(MENU_EVENTS.NAV_NEXT_LIST);
        },
      }),
    ],
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
    ],
  });

  await windowSubmenu.setAsWindowsMenuForNSApp();

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

  return menu;
};

/**
 * initializes the application menu
 * should be called during app bootstrap
 */
export const initAppMenu = async (options?: {
  showCompleted?: boolean;
  sortMode?: SortMode;
  sortDirection?: SortDirection;
  shortcuts?: KeyboardShortcut[];
  accounts?: MenuAccount[];
  caldavAccountCount?: number;
  isSyncing?: boolean;
  isEditorOpen?: boolean;
  isModalOpen?: boolean;
}) => {
  // only create menu on macOS
  if (!isMacPlatform()) return;

  try {
    const menu = await createMacMenu(options);
    await menu.setAsAppMenu();
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
  showUnstarted?: boolean;
  sortMode?: SortMode;
  sortDirection?: SortDirection;
  shortcuts?: KeyboardShortcut[];
  accounts?: MenuAccount[];
  caldavAccountCount?: number;
  isSyncing?: boolean;
  isEditorOpen?: boolean;
  isModalOpen?: boolean;
}) => {
  await initAppMenu(options);
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
      case 'delete-task':
        item = menuItemRefs.deleteTask;
        break;
      case 'toggle-completed':
        item = menuItemRefs.toggleCompleted;
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
    }

    if (!item) return;

    if (updates.text !== undefined && 'setText' in item) {
      await item.setText(updates.text);
    }

    if (updates.enabled !== undefined && 'setEnabled' in item) {
      await item.setEnabled(updates.enabled);
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
  showUnstarted?: boolean;
  sortMode?: SortMode;
  sortDirection?: SortDirection;
  isSyncing?: boolean;
  isEditorOpen?: boolean;
  isModalOpen?: boolean;
}) => {
  const isAppActionEnabled = (enabled = true) =>
    isEnabledOutsideModal(options.isModalOpen ?? false, enabled);

  if (options.accountCount !== undefined || options.isSyncing !== undefined) {
    const hasAccounts = (options.accountCount ?? 1) > 0;
    const isSyncing = options.isSyncing ?? false;
    await updateMenuItem('sync', { enabled: isAppActionEnabled(hasAccounts && !isSyncing) });
  }
  if (options.isEditorOpen !== undefined) {
    await updateMenuItem('delete-task', { enabled: isAppActionEnabled(options.isEditorOpen) });
  }
  if (options.showCompleted !== undefined) {
    await updateMenuItem('toggle-completed', { checked: options.showCompleted });
  }
  if (options.showUnstarted !== undefined) {
    await updateMenuItem('toggle-unstarted', { checked: options.showUnstarted });
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
    const directionItemEnabled = isAppActionEnabled(directionSubmenuEnabled);
    await updateMenuItem('sort-direction-submenu', { enabled: directionSubmenuEnabled });
    await updateMenuItem('sort-direction-asc', { enabled: directionItemEnabled });
    await updateMenuItem('sort-direction-desc', { enabled: directionItemEnabled });
  }
  if (options.sortDirection !== undefined) {
    await updateMenuItem('sort-direction-asc', {
      text: options.sortDirection === 'asc' ? '✓ Ascending' : 'Ascending',
    });
    await updateMenuItem('sort-direction-desc', {
      text: options.sortDirection === 'desc' ? '✓ Descending' : 'Descending',
    });
  }
};
