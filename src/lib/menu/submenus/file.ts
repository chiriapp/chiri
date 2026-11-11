import { emit } from '@tauri-apps/api/event';
import { MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu';
import { MENU_EVENTS } from '$constants/menu';
import { getAcceleratorOrDefault } from '$lib/menu/accelerators';
import { separator } from '$lib/menu/items';
import { isEnabledOutsideModal } from '$lib/menu/modal';
import type { KeyboardShortcut } from '$types/shortcuts';

export const createFileSubmenu = async ({
  shortcuts,
  isModalOpen,
}: {
  shortcuts?: KeyboardShortcut[];
  isModalOpen: boolean;
}) => {
  const isAppActionEnabled = (enabled = true) => isEnabledOutsideModal(isModalOpen, enabled);

  return Submenu.new({
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
      await separator(),
      await MenuItem.new({
        id: 'import',
        text: 'Import Tasks...',
        accelerator: getAcceleratorOrDefault(shortcuts, 'import-tasks', 'CmdOrCtrl+I'),
        enabled: isAppActionEnabled(),
        action: () => {
          emit(MENU_EVENTS.IMPORT_TASKS);
        },
      }),
      await separator(),
      await PredefinedMenuItem.new({
        text: 'Close Window',
        item: 'CloseWindow',
      }),
    ],
  });
};
