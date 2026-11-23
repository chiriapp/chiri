import { invoke } from '@tauri-apps/api/core';
import { loggers } from '$lib/logger';
import { applyMacMenuFixes } from '$lib/menu';
import { GROUP_MENU_OPTIONS, isGroupDirectionEnabled, isGroupModeEnabled } from '$lib/menu/group';
import { isModalMenuOpen, replaceSubmenuContents, setModalMenuState } from '$lib/menu/modal';
import { SORT_LABELS } from '$lib/menu/sort';
import {
  enqueueSubmenuMutation,
  findModalMenuItem,
  getTrackedMenuItem,
  navigationMenuItems,
  submenuRefs,
} from '$lib/menu/state';
import { createAccountsSubmenu } from '$lib/menu/submenus/accounts';
import { createGoSubmenu } from '$lib/menu/submenus/go';
import type { DockMenuFilter, MenuAccount, MenuNavigationOptions } from '$lib/menu/types';
import type { KeyboardShortcut } from '$types/shortcuts';
import type { SortDirection, SortMode, TaskGroupMode } from '$types/sort';
import { isMacPlatform } from '$utils/platform';

const log = loggers.menu;

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
 * refreshes the Go submenu in place so navigation changes don't replace NSApp's menu
 */
export const updateGoMenu = async (options: {
  shortcuts?: KeyboardShortcut[];
  navigation?: MenuNavigationOptions;
}) => {
  if (!isMacPlatform()) return;

  try {
    await enqueueSubmenuMutation(async () => {
      const target = submenuRefs.go;
      if (!target) return;

      const replacement = await createGoSubmenu({
        navigation: options.navigation,
        shortcuts: options.shortcuts,
        isModalOpen: false,
      });
      await replaceSubmenuContents(target, replacement);
      // the replacement dropped the native section header, so put it back
      await applyMacMenuFixes();
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
      const target = submenuRefs.accounts;
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
    const item = getTrackedMenuItem(menuId);
    if (!item) return;

    if (updates.text !== undefined && 'setText' in item) {
      await item.setText(updates.text);
    }

    if (updates.enabled !== undefined && 'setEnabled' in item) {
      const modalMenuItem = findModalMenuItem(menuId);
      if (modalMenuItem) {
        modalMenuItem.normallyEnabled = updates.enabled;
        await item.setEnabled(!isModalMenuOpen() && updates.enabled);
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
  taskGroupMode?: TaskGroupMode;
  taskGroupDirection?: SortDirection;
  activeCalendarId?: string | null;
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
    const activeListKey = options.activeListKey;
    await Promise.all(
      [...navigationMenuItems.entries()].map(([listKey, item]) =>
        item.setChecked(listKey === activeListKey),
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
    for (const mode of Object.keys(SORT_LABELS)) {
      await updateMenuItem(`sort-${mode}`, { checked: mode === options.sortMode });
    }

    // enable/disable sort direction submenu and items based on sort mode
    const directionSubmenuEnabled = options.sortMode !== 'manual';
    await updateMenuItem('sort-direction-submenu', { enabled: directionSubmenuEnabled });
    await updateMenuItem('sort-direction-asc', { enabled: directionSubmenuEnabled });
    await updateMenuItem('sort-direction-desc', { enabled: directionSubmenuEnabled });
  }
  if (options.sortDirection !== undefined) {
    await updateMenuItem('sort-direction-asc', { checked: options.sortDirection === 'asc' });
    await updateMenuItem('sort-direction-desc', { checked: options.sortDirection === 'desc' });
  }
  if (options.taskGroupMode !== undefined) {
    const { taskGroupMode } = options;
    const activeCalendarId = options.activeCalendarId ?? null;
    for (const option of GROUP_MENU_OPTIONS) {
      await updateMenuItem(option.id, {
        checked: option.mode === taskGroupMode,
        enabled: isGroupModeEnabled(option.mode, activeCalendarId),
      });
    }

    const directionSubmenuEnabled = isGroupDirectionEnabled(taskGroupMode, activeCalendarId);
    await updateMenuItem('group-direction-submenu', { enabled: directionSubmenuEnabled });
    await updateMenuItem('group-direction-asc', { enabled: directionSubmenuEnabled });
    await updateMenuItem('group-direction-desc', { enabled: directionSubmenuEnabled });
  }
  if (options.taskGroupDirection !== undefined) {
    await updateMenuItem('group-direction-asc', {
      checked: options.taskGroupDirection === 'asc',
    });
    await updateMenuItem('group-direction-desc', {
      checked: options.taskGroupDirection === 'desc',
    });
  }
  if (options.isModalOpen === false) await setModalMenuState(false);
};
