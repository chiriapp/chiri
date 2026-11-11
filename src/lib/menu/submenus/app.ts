import { emit } from '@tauri-apps/api/event';
import { MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu';
import { MENU_EVENTS } from '$constants/menu';
import { getAcceleratorOrDefault } from '$lib/menu/accelerators';
import { separator } from '$lib/menu/items';
import { isEnabledOutsideModal } from '$lib/menu/modal';
import type { KeyboardShortcut } from '$types/shortcuts';

export const createAppSubmenu = async ({
  shortcuts,
  isModalOpen,
}: {
  shortcuts?: KeyboardShortcut[];
  isModalOpen: boolean;
}) => {
  const isAppActionEnabled = (enabled = true) => isEnabledOutsideModal(isModalOpen, enabled);

  return Submenu.new({
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
      await separator(),
      await MenuItem.new({
        id: 'preferences',
        text: 'Settings...',
        accelerator: getAcceleratorOrDefault(shortcuts, 'settings', 'CmdOrCtrl+,'),
        enabled: isAppActionEnabled(),
        action: () => {
          emit(MENU_EVENTS.PREFERENCES);
        },
      }),
      await separator(),
      await PredefinedMenuItem.new({
        text: 'Services',
        item: 'Services',
      }),
      await separator(),
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
      await separator(),
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
};
