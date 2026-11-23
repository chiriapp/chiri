import { CheckMenuItem, MenuItem, PredefinedMenuItem } from '@tauri-apps/api/menu';
import { trackMenuItem } from '$lib/menu/state';

export const separator = () => PredefinedMenuItem.new({ item: 'Separator' });

/** placeholders the native pass swaps for AppKit's section header items (macOS 14+) */
export const sectionHeader = (id: string, text: string) =>
  MenuItem.new({ id, text, enabled: false });

/**
 * an option of a menu acting as a radio group; muda flips a check item's own
 * state on click and app state only corrects it when the selection changes, so
 * the clicked item reasserts the value it stands for
 */
export const radioItem = async ({
  id,
  text,
  checked,
  enabled,
  action,
}: {
  id: string;
  text: string;
  checked: boolean;
  enabled: boolean;
  action: () => void;
}) => {
  const item = trackMenuItem(
    await CheckMenuItem.new({
      id,
      text,
      checked,
      enabled,
      action: () => {
        action();
        item.setChecked(true).catch(() => {});
      },
    }),
  );
  return item;
};
