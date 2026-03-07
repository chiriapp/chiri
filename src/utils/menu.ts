import { emit } from '@tauri-apps/api/event';
import {
  CheckMenuItem,
  IconMenuItem,
  Menu,
  MenuItem,
  PredefinedMenuItem,
  Submenu,
} from '@tauri-apps/api/menu';
import { loggers } from '$lib/logger';
import type { KeyboardShortcut, SortMode } from '$types/index';
import { isMacPlatform } from '$utils/platform';

const log = loggers.menu;

export const MENU_EVENTS = {
  ABOUT: 'menu:about',
  NEW_TASK: 'menu:new-task',
  SYNC: 'menu:sync',
  PREFERENCES: 'menu:preferences',
  ADD_ACCOUNT: 'menu:add-account',
  EDIT_ACCOUNT: 'menu:edit-account',
  ADD_CALENDAR: 'menu:add-calendar',
  IMPORT_TASKS: 'menu:import-tasks',
  EXPORT_TASKS: 'menu:export-tasks',
  SEARCH: 'menu:search',
  SHOW_KEYBOARD_SHORTCUTS: 'menu:show-keyboard-shortcuts',
  TOGGLE_COMPLETED: 'menu:toggle-completed',
  TOGGLE_UNSTARTED: 'menu:toggle-unstarted',
  SORT_MANUAL: 'menu:sort-manual',
  SORT_SMART: 'menu:sort-smart',
  SORT_START_DATE: 'menu:sort-start-date',
  SORT_DUE_DATE: 'menu:sort-due-date',
  SORT_PRIORITY: 'menu:sort-priority',
  SORT_TITLE: 'menu:sort-title',
  SORT_CREATED: 'menu:sort-created',
  SORT_MODIFIED: 'menu:sort-modified',
} as const;

// store menu item references for updates
const menuItemRefs: {
  sync?: IconMenuItem;
  export?: IconMenuItem;
  addCalendar?: MenuItem;
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
export const createMacMenu = async (options?: {
  showCompleted?: boolean;
  showUnstarted?: boolean;
  sortMode?: SortMode;
  shortcuts?: KeyboardShortcut[];
  hasAccounts?: boolean;
  hasTasks?: boolean;
  isSyncing?: boolean;
}): Promise<Menu> => {
  const showCompleted = options?.showCompleted ?? true;
  const showUnstarted = options?.showUnstarted ?? true;
  const sortMode = options?.sortMode ?? 'manual';
  const shortcuts = options?.shortcuts;
  const hasAccounts = options?.hasAccounts ?? false;
  const hasTasks = options?.hasTasks ?? false;
  const isSyncing = options?.isSyncing ?? false;

  const appSubmenu = await Submenu.new({
    text: 'caldav-tasks',
    items: [
      await MenuItem.new({
        id: 'about',
        text: 'About CalDAV Tasks',
        action: () => {
          emit(MENU_EVENTS.ABOUT);
        },
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({
        id: 'preferences',
        text: 'Preferences...',
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
        text: 'Hide CalDAV Tasks',
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
      await PredefinedMenuItem.new({
        text: 'Quit CalDAV Tasks',
        item: 'Quit',
      }),
    ],
  });

  const syncItem = await IconMenuItem.new({
    id: 'sync',
    text: 'Sync',
    icon: 'Refresh',
    accelerator: getAcceleratorById(shortcuts, 'sync') ?? 'CmdOrCtrl+R',
    enabled: hasAccounts && !isSyncing,
    action: () => {
      emit(MENU_EVENTS.SYNC);
    },
  });
  menuItemRefs.sync = syncItem;

  const exportItem = await IconMenuItem.new({
    id: 'export',
    text: 'Export...',
    icon: 'Share',
    accelerator: 'CmdOrCtrl+E',
    enabled: hasTasks,
    action: () => {
      emit(MENU_EVENTS.EXPORT_TASKS);
    },
  });
  menuItemRefs.export = exportItem;

  const fileSubmenu = await Submenu.new({
    text: 'File',
    items: [
      await IconMenuItem.new({
        id: 'new-task',
        text: 'New Task',
        icon: 'Add',
        accelerator: getAcceleratorById(shortcuts, 'new-task') ?? 'CmdOrCtrl+N',
        action: () => {
          emit(MENU_EVENTS.NEW_TASK);
        },
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      syncItem,
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await IconMenuItem.new({
        id: 'import',
        text: 'Import...',
        icon: 'Bookmarks',
        accelerator: 'CmdOrCtrl+I',
        action: () => {
          emit(MENU_EVENTS.IMPORT_TASKS);
        },
      }),
      exportItem,
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({
        text: 'Close Window',
        item: 'CloseWindow',
      }),
    ],
  });

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
    ],
  });

  // View submenu
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
    accelerator: getAcceleratorById(shortcuts, 'toggle-show-unstarted') ?? 'CmdOrCtrl+Shift+U',
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

  const sortPriorityItem = await MenuItem.new({
    id: 'sort-priority',
    text: sortMode === 'priority' ? '✓ Priority' : 'Priority',
    action: () => {
      emit(MENU_EVENTS.SORT_PRIORITY);
    },
  });
  menuItemRefs.sortPriority = sortPriorityItem;

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

  const viewSubmenu = await Submenu.new({
    text: 'View',
    items: [
      toggleCompletedItem,
      toggleUnstartedItem,
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await Submenu.new({
        icon: 'ListView',
        text: 'Sort Tasks By',
        items: [
          sortManualItem,
          sortSmartItem,
          sortStartDateItem,
          sortDueDateItem,
          sortPriorityItem,
          sortTitleItem,
          sortCreatedItem,
          sortModifiedItem,
        ],
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({
        text: 'Enter Full Screen',
        item: 'Fullscreen',
      }),
    ],
  });

  // Calendar submenu
  const addCalendarItem = await MenuItem.new({
    id: 'add-calendar',
    text: 'Add Calendar...',
    enabled: hasAccounts,
    action: () => {
      emit(MENU_EVENTS.ADD_CALENDAR);
    },
  });
  menuItemRefs.addCalendar = addCalendarItem;

  const calendarSubmenu = await Submenu.new({
    text: 'Calendar',
    items: [
      await MenuItem.new({
        id: 'add-account',
        text: 'Add Account...',
        action: () => {
          emit(MENU_EVENTS.ADD_ACCOUNT);
        },
      }),
      addCalendarItem,
    ],
  });

  // Window submenu
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
        accelerator: 'CmdOrCtrl+/',
        action: () => {
          emit(MENU_EVENTS.SHOW_KEYBOARD_SHORTCUTS);
        },
      }),
    ],
  });

  await helpSubmenu.setAsHelpMenuForNSApp().catch(() => {});

  // Create the main menu
  const menu = await Menu.new({
    items: [
      appSubmenu,
      fileSubmenu,
      editSubmenu,
      viewSubmenu,
      calendarSubmenu,
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
  shortcuts?: KeyboardShortcut[];
  hasAccounts?: boolean;
  hasTasks?: boolean;
  isSyncing?: boolean;
}): Promise<void> => {
  // Only create menu on macOS
  if (!isMacPlatform()) return;

  try {
    const menu = await createMacMenu(options);
    await menu.setAsAppMenu();
    log.info('macOS menu initialized successfully');
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
  shortcuts?: KeyboardShortcut[];
  hasAccounts?: boolean;
  hasTasks?: boolean;
  isSyncing?: boolean;
}): Promise<void> => {
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
): Promise<void> => {
  try {
    // Use stored references instead of searching the menu
    let item: MenuItem | IconMenuItem | CheckMenuItem | undefined;

    switch (menuId) {
      case 'sync':
        item = menuItemRefs.sync;
        break;
      case 'export':
        item = menuItemRefs.export;
        break;
      case 'add-calendar':
        item = menuItemRefs.addCalendar;
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
    }

    if (!item) {
      log.warn(`Item with id "${menuId}" not found in refs`);
      return;
    }

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
  hasAccounts?: boolean;
  hasTasks?: boolean;
  showCompleted?: boolean;
  showUnstarted?: boolean;
  sortMode?: SortMode;
  isSyncing?: boolean;
}): Promise<void> => {
  if (options.hasAccounts !== undefined || options.isSyncing !== undefined) {
    const hasAccounts = options.hasAccounts ?? true;
    const isSyncing = options.isSyncing ?? false;
    await updateMenuItem('add-calendar', { enabled: hasAccounts });
    await updateMenuItem('sync', { enabled: hasAccounts && !isSyncing });
  }
  if (options.hasTasks !== undefined) {
    await updateMenuItem('export', { enabled: options.hasTasks });
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
      'start-date': 'Start Date',
      'due-date': 'Due Date',
      priority: 'Priority',
      title: 'Title',
      created: 'Date Created',
      modified: 'Date Modified',
    };

    log.debug('Updating sort menu checkmarks, active mode:', options.sortMode);
    for (const [mode, label] of Object.entries(sortOptions)) {
      const hasCheck = mode === options.sortMode;
      await updateMenuItem(`sort-${mode}`, {
        text: hasCheck ? `✓ ${label}` : label,
      });
    }
  }
};
