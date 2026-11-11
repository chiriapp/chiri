import { Menu } from '@tauri-apps/api/menu';
import { createAccountsSubmenu } from '$lib/menu/submenus/accounts';
import { createAppSubmenu } from '$lib/menu/submenus/app';
import { createEditSubmenu } from '$lib/menu/submenus/edit';
import { createFileSubmenu } from '$lib/menu/submenus/file';
import { createGoSubmenu } from '$lib/menu/submenus/go';
import { createHelpSubmenu } from '$lib/menu/submenus/help';
import { createViewSubmenu } from '$lib/menu/submenus/view';
import { createWindowSubmenu } from '$lib/menu/submenus/window';
import type { AppMenuOptions } from '$lib/menu/types';

export const createMacMenu = async (options: AppMenuOptions = {}) => {
  const showCompleted = options.showCompleted ?? true;
  const moveCompletedTasksToBottom = options.moveCompletedTasksToBottom ?? false;
  const showUnstarted = options.showUnstarted ?? true;
  const sortMode = options.sortMode ?? 'manual';
  const sortDirection = options.sortDirection ?? 'asc';
  const shortcuts = options.shortcuts;
  const accounts = options.accounts ?? [];
  const isSyncing = options.isSyncing ?? false;
  const isModalOpen = options.isModalOpen ?? false;

  const appSubmenu = await createAppSubmenu({ shortcuts, isModalOpen });
  const fileSubmenu = await createFileSubmenu({ shortcuts, isModalOpen });
  const editSubmenu = await createEditSubmenu({ shortcuts, isModalOpen });
  const viewSubmenu = await createViewSubmenu({
    showCompleted,
    moveCompletedTasksToBottom,
    showUnstarted,
    sortMode,
    sortDirection,
    shortcuts,
    isModalOpen,
  });
  const accountsSubmenu = await createAccountsSubmenu({
    accounts,
    shortcuts,
    caldavAccountCount: options.caldavAccountCount ?? accounts.length,
    isSyncing,
    isModalOpen,
  });
  const goSubmenu = await createGoSubmenu({
    navigation: options.navigation,
    shortcuts,
    isModalOpen,
  });
  const windowSubmenu = await createWindowSubmenu();
  const helpSubmenu = await createHelpSubmenu({ shortcuts, isModalOpen });

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
