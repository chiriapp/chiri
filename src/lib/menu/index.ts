import { invoke } from '@tauri-apps/api/core';
import { Submenu } from '@tauri-apps/api/menu';
import { loggers } from '$lib/logger';
import { createMacMenu } from '$lib/menu/create';
import {
  collectModalMenuItems,
  isModalMenuOpen,
  resetModalMenuState,
  setModalMenuState,
} from '$lib/menu/modal';
import { enqueueSubmenuMutation, modalMenuItems, submenuRefs } from '$lib/menu/state';
import type { AppMenuOptions } from '$lib/menu/types';
import { isMacPlatform } from '$utils/platform';

const log = loggers.menu;

export const initAppMenu = async (options?: AppMenuOptions) => {
  // only create menu on macOS. we might bother with app menus later on linux but i cba
  if (!isMacPlatform()) return;

  try {
    const shouldApplyModalState = options?.isModalOpen ?? isModalMenuOpen();
    const { menu, windowSubmenu, goSubmenu, accountsSubmenu } = await createMacMenu({
      ...options,
      isModalOpen: false,
    });
    await menu.setAsAppMenu();
    submenuRefs.go = goSubmenu;
    submenuRefs.accounts = accountsSubmenu;
    modalMenuItems.length = 0;
    resetModalMenuState();
    for (const item of await menu.items()) {
      if (item instanceof Submenu) await collectModalMenuItems(item);
    }
    if (shouldApplyModalState) await setModalMenuState(true);
    await windowSubmenu.setAsWindowsMenuForNSApp();
    // fix macOS Help menu search bar; tauri's setAsHelpMenuForNSApp() implementation is broken,
    // so we call NSApp.setHelpMenu() directly from Rust after the menu is live
    await invoke('apply_macos_menu_fixes').catch(() => {});
  } catch (error) {
    log.error('Failed to initialize menu:', error);
  }
};

/**
 * rebuilds the app menu with new shortcuts
 * call this when keyboard shortcuts are changed in settings
 */
export const rebuildAppMenu = async (options?: AppMenuOptions) => {
  await enqueueSubmenuMutation(() => initAppMenu(options));
};
