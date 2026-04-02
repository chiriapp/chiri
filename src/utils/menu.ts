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
import type { KeyboardShortcut, SortDirection, SortMode } from '$types';
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
  if (!shortcut) return undefined;

  const parts: string[] = [];

  if (shortcut.meta) parts.push('CmdOrCtrl');
  if (shortcut.ctrl && !shortcut.meta) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');

  if (shortcut.key) {
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
  }

  return parts.length > 0 ? parts.join('+') : undefined;
};

/**
 * gets the accelerator for a specific shortcut ID from the shortcuts array
 */
const getAcceleratorById = (shortcuts: KeyboardShortcut[] | undefined, id: string) => {
  if (!shortcuts) return undefined;
  const shortcut = shortcuts.find((s) => s.id === id);
  return shortcutToAccelerator(shortcut);
};

/**
 * creates and sets the macOS application menu
 * only called on macOS
 */
export interface MenuCalendar {
  id: string;
  displayName: string;
}

export interface MenuAccount {
  id: string;
  name: string;
  calendars?: MenuCalendar[];
}

export const createMacMenu = async (options?: {
  showCompleted?: boolean;
  showUnstarted?: boolean;
  sortMode?: SortMode;
  sortDirection?: SortDirection;
  shortcuts?: KeyboardShortcut[];
  accounts?: MenuAccount[];
  isSyncing?: boolean;
  isEditorOpen?: boolean;
}) => {
  const showCompleted = options?.showCompleted ?? true;
  const showUnstarted = options?.showUnstarted ?? true;
  const sortMode = options?.sortMode ?? 'manual';
  const sortDirection = options?.sortDirection ?? 'asc';
  const shortcuts = options?.shortcuts;
  const accounts = options?.accounts ?? [];
  const hasAccounts = accounts.length > 0;
  const isSyncing = options?.isSyncing ?? false;
  const isEditorOpen = options?.isEditorOpen ?? false;

  // App menu (Chiri)
  const appSubmenu = await Submenu.new({
    text: 'Chiri',
    items: [
      await MenuItem.new({
        id: 'about',
        text: 'About Chiri',
        action: () => {
          emit(MENU_EVENTS.ABOUT);
        },
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({
        id: 'preferences',
        text: 'Settings...',
        accelerator: getAcceleratorById(shortcuts, 'settings') ?? 'CmdOrCtrl+,',
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

  // File menu
  const fileSubmenu = await Submenu.new({
    text: 'File',
    items: [
      await MenuItem.new({
        id: 'new-task',
        text: 'New Task',
        accelerator: getAcceleratorById(shortcuts, 'new-task') ?? 'CmdOrCtrl+N',
        action: () => {
          emit(MENU_EVENTS.NEW_TASK);
        },
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({
        id: 'import',
        text: 'Import Tasks...',
        accelerator: 'CmdOrCtrl+I',
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

  // Edit menu
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
        accelerator: getAcceleratorById(shortcuts, 'search') ?? 'CmdOrCtrl+F',
        action: () => {
          emit(MENU_EVENTS.SEARCH);
        },
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await (async () => {
        const item = await MenuItem.new({
          id: 'delete-task',
          text: 'Delete Task',
          accelerator: getAcceleratorById(shortcuts, 'delete') ?? 'CmdOrCtrl+Backspace',
          enabled: isEditorOpen,
          action: () => {
            emit(MENU_EVENTS.DELETE_TASK);
          },
        });
        menuItemRefs.deleteTask = item;
        return item;
      })(),
    ],
  });

  // View menu
  const toggleCompletedItem = await CheckMenuItem.new({
    id: 'toggle-completed',
    text: 'Show Completed Tasks',
    accelerator: getAcceleratorById(shortcuts, 'toggle-show-completed') ?? 'CmdOrCtrl+Shift+H',
    checked: showCompleted,
    action: () => {
      emit(MENU_EVENTS.TOGGLE_COMPLETED);
    },
  });
  menuItemRefs.toggleCompleted = toggleCompletedItem;

  const toggleUnstartedItem = await CheckMenuItem.new({
    id: 'toggle-unstarted',
    text: 'Show Unstarted Tasks',
    accelerator: getAcceleratorById(shortcuts, 'toggle-show-unstarted') ?? 'CmdOrCtrl+U',
    checked: showUnstarted,
    action: () => {
      emit(MENU_EVENTS.TOGGLE_UNSTARTED);
    },
  });
  menuItemRefs.toggleUnstarted = toggleUnstartedItem;

  const sortManualItem = await MenuItem.new({
    id: 'sort-manual',
    text: sortMode === 'manual' ? '✓ Manual' : 'Manual',
    action: () => {
      emit(MENU_EVENTS.SORT_MANUAL);
    },
  });
  menuItemRefs.sortManual = sortManualItem;

  const sortSmartItem = await MenuItem.new({
    id: 'sort-smart',
    text: sortMode === 'smart' ? '✓ Smart Sort' : 'Smart Sort',
    action: () => {
      emit(MENU_EVENTS.SORT_SMART);
    },
  });
  menuItemRefs.sortSmart = sortSmartItem;

  const sortPriorityItem = await MenuItem.new({
    id: 'sort-priority',
    text: sortMode === 'priority' ? '✓ Priority' : 'Priority',
    action: () => {
      emit(MENU_EVENTS.SORT_PRIORITY);
    },
  });
  menuItemRefs.sortPriority = sortPriorityItem;

  const sortStartDateItem = await MenuItem.new({
    id: 'sort-start-date',
    text: sortMode === 'start-date' ? '✓ Start Date' : 'Start Date',
    action: () => {
      emit(MENU_EVENTS.SORT_START_DATE);
    },
  });
  menuItemRefs.sortStartDate = sortStartDateItem;

  const sortDueDateItem = await MenuItem.new({
    id: 'sort-due-date',
    text: sortMode === 'due-date' ? '✓ Due Date' : 'Due Date',
    action: () => {
      emit(MENU_EVENTS.SORT_DUE_DATE);
    },
  });
  menuItemRefs.sortDueDate = sortDueDateItem;

  const sortTitleItem = await MenuItem.new({
    id: 'sort-title',
    text: sortMode === 'title' ? '✓ Title' : 'Title',
    action: () => {
      emit(MENU_EVENTS.SORT_TITLE);
    },
  });
  menuItemRefs.sortTitle = sortTitleItem;

  const sortCreatedItem = await MenuItem.new({
    id: 'sort-created',
    text: sortMode === 'created' ? '✓ Date Created' : 'Date Created',
    action: () => {
      emit(MENU_EVENTS.SORT_CREATED);
    },
  });
  menuItemRefs.sortCreated = sortCreatedItem;

  const sortModifiedItem = await MenuItem.new({
    id: 'sort-modified',
    text: sortMode === 'modified' ? '✓ Date Modified' : 'Date Modified',
    action: () => {
      emit(MENU_EVENTS.SORT_MODIFIED);
    },
  });
  menuItemRefs.sortModified = sortModifiedItem;

  const sortDirectionAscItem = await MenuItem.new({
    id: 'sort-direction-asc',
    text: sortDirection === 'asc' ? '✓ Ascending' : 'Ascending',
    enabled: sortMode !== 'manual',
    action: () => {
      emit(MENU_EVENTS.SORT_DIRECTION_ASC);
    },
  });
  menuItemRefs.sortDirectionAsc = sortDirectionAscItem;

  const sortDirectionDescItem = await MenuItem.new({
    id: 'sort-direction-desc',
    text: sortDirection === 'desc' ? '✓ Descending' : 'Descending',
    enabled: sortMode !== 'manual',
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
        accelerator: getAcceleratorById(shortcuts, 'toggle-sidebar') ?? 'CmdOrCtrl+E',
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

  // Accounts menu (CalDAV accounts and calendars)
  const syncItem = await MenuItem.new({
    id: 'sync',
    text: 'Sync',
    accelerator: getAcceleratorById(shortcuts, 'sync') ?? 'CmdOrCtrl+R',
    enabled: hasAccounts && !isSyncing,
    action: () => {
      emit(MENU_EVENTS.SYNC);
    },
  });
  menuItemRefs.sync = syncItem;

  // One submenu per account with account-scoped actions
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
                action: () => {
                  emit(MENU_EVENTS.SYNC_CALENDAR, {
                    calendarId: calendar.id,
                    accountId: account.id,
                  });
                },
              }),
              await MenuItem.new({
                text: 'Edit Calendar',
                action: () => {
                  emit(MENU_EVENTS.EDIT_CALENDAR, {
                    calendarId: calendar.id,
                    accountId: account.id,
                  });
                },
              }),
              await MenuItem.new({
                text: 'Export Tasks',
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
            action: () => {
              emit(MENU_EVENTS.ADD_CALENDAR, { accountId: account.id });
            },
          }),
          await MenuItem.new({
            text: 'Edit Account',
            action: () => {
              emit(MENU_EVENTS.EDIT_ACCOUNT, { accountId: account.id });
            },
          }),
          await MenuItem.new({
            text: 'Remove Account',
            action: () => {
              emit(MENU_EVENTS.REMOVE_ACCOUNT, { accountId: account.id });
            },
          }),
        ],
      });
    }),
  );

  const accountsSubmenu = await Submenu.new({
    text: 'Accounts',
    items: [
      syncItem,
      await PredefinedMenuItem.new({ item: 'Separator' }),
      ...accountSubmenus,
      ...(hasAccounts ? [await PredefinedMenuItem.new({ item: 'Separator' })] : []),
      await MenuItem.new({
        id: 'add-account',
        text: 'Add Account...',
        action: () => {
          emit(MENU_EVENTS.ADD_ACCOUNT);
        },
      }),
    ],
  });

  // Go menu (list navigation)
  const goSubmenu = await Submenu.new({
    text: 'Go',
    items: [
      await MenuItem.new({
        id: 'nav-prev-list',
        text: 'Previous List',
        accelerator: getAcceleratorById(shortcuts, 'nav-prev-list') ?? 'CmdOrCtrl+[',
        action: () => {
          emit(MENU_EVENTS.NAV_PREV_LIST);
        },
      }),
      await MenuItem.new({
        id: 'nav-next-list',
        text: 'Next List',
        accelerator: getAcceleratorById(shortcuts, 'nav-next-list') ?? 'CmdOrCtrl+]',
        action: () => {
          emit(MENU_EVENTS.NAV_NEXT_LIST);
        },
      }),
    ],
  });

  // Window menu
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

  // Help submenu
  const helpSubmenu = await Submenu.new({
    text: 'Help',
    items: [
      await MenuItem.new({
        id: 'keyboard-shortcuts',
        text: 'Keyboard Shortcuts',
        accelerator: getAcceleratorById(shortcuts, 'keyboard-shortcuts') ?? 'CmdOrCtrl+/',
        action: () => {
          emit(MENU_EVENTS.SHOW_KEYBOARD_SHORTCUTS);
        },
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({
        id: 'whats-new',
        text: "What's New",
        action: () => {
          emit(MENU_EVENTS.SHOW_CHANGELOG);
        },
      }),
      await MenuItem.new({
        id: 'check-for-updates',
        text: 'Check for Updates',
        action: () => {
          emit(MENU_EVENTS.CHECK_FOR_UPDATES);
        },
      }),
    ],
  });

  // Create the main menu
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
 * Initializes the application menu
 * Should be called during app bootstrap
 */
export const initAppMenu = async (options?: {
  showCompleted?: boolean;
  sortMode?: SortMode;
  sortDirection?: SortDirection;
  shortcuts?: KeyboardShortcut[];
  accounts?: MenuAccount[];
  isSyncing?: boolean;
  isEditorOpen?: boolean;
}) => {
  // Only create menu on macOS
  if (!isMacPlatform()) return;

  try {
    const menu = await createMacMenu(options);
    await menu.setAsAppMenu();
    // Fix macOS Help menu search bar — muda's setAsHelpMenuForNSApp() is broken,
    // so we call NSApp.setHelpMenu() directly from Rust after the menu is live.
    await invoke('apply_macos_menu_fixes').catch(() => {});
  } catch (error) {
    log.error('Failed to initialize menu:', error);
  }
};

/**
 * Rebuilds the app menu with new shortcuts
 * Call this when keyboard shortcuts are changed in settings
 */
export const rebuildAppMenu = async (options?: {
  showCompleted?: boolean;
  showUnstarted?: boolean;
  sortMode?: SortMode;
  sortDirection?: SortDirection;
  shortcuts?: KeyboardShortcut[];
  accounts?: MenuAccount[];
  isSyncing?: boolean;
  isEditorOpen?: boolean;
}) => {
  await initAppMenu(options);
};

/**
 * Updates a specific menu item's state
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
    // Use stored references instead of searching the menu
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
}) => {
  if (options.accountCount !== undefined || options.isSyncing !== undefined) {
    const hasAccounts = (options.accountCount ?? 1) > 0;
    const isSyncing = options.isSyncing ?? false;
    await updateMenuItem('sync', { enabled: hasAccounts && !isSyncing });
  }
  if (options.isEditorOpen !== undefined) {
    await updateMenuItem('delete-task', { enabled: options.isEditorOpen });
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

    // Enable/disable sort direction submenu and items based on sort mode
    const directionEnabled = options.sortMode !== 'manual';
    await updateMenuItem('sort-direction-submenu', { enabled: directionEnabled });
    await updateMenuItem('sort-direction-asc', { enabled: directionEnabled });
    await updateMenuItem('sort-direction-desc', { enabled: directionEnabled });
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
