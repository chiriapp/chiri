import { PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu';
import { separator } from '$lib/menu/items';

export const createWindowSubmenu = async () =>
  Submenu.new({
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
      await separator(),
      await PredefinedMenuItem.new({
        text: 'Bring All to Front',
        item: 'BringAllToFront',
      }),
    ],
  });
