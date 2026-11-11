import { emit } from '@tauri-apps/api/event';
import { MenuItem, Submenu } from '@tauri-apps/api/menu';
import { MENU_EVENTS } from '$constants/menu';
import { getAcceleratorOrDefault } from '$lib/menu/accelerators';
import { separator } from '$lib/menu/items';
import { isEnabledOutsideModal } from '$lib/menu/modal';
import type { KeyboardShortcut } from '$types/shortcuts';

export const createHelpSubmenu = async ({
  shortcuts,
  isModalOpen,
}: {
  shortcuts?: KeyboardShortcut[];
  isModalOpen: boolean;
}) => {
  const isAppActionEnabled = (enabled = true) => isEnabledOutsideModal(isModalOpen, enabled);

  return Submenu.new({
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
      await separator(),
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
};
