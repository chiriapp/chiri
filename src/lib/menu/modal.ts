import type { IconMenuItem, PredefinedMenuItem } from '@tauri-apps/api/menu';
import { CheckMenuItem, MenuItem, Submenu } from '@tauri-apps/api/menu';
import type { TrackedMenuItem } from '$lib/menu/state';
import { modalMenuItems } from '$lib/menu/state';

type MenuTreeItem = TrackedMenuItem | IconMenuItem | PredefinedMenuItem;

let modalMenuOpen = false;

export const isModalMenuOpen = () => modalMenuOpen;

export const isEnabledOutsideModal = (isModalOpen: boolean, enabled = true) =>
  !isModalOpen && enabled;

const walkSubmenu = async (
  submenu: Submenu,
  visit: (item: TrackedMenuItem) => Promise<void> | void,
) => {
  for (const item of await submenu.items()) {
    if (item instanceof Submenu) {
      await visit(item);
      await walkSubmenu(item, visit);
    } else if (item instanceof MenuItem || item instanceof CheckMenuItem) {
      // these two actions remain available while a modal is open
      if (item.id === 'quit' || item.id === 'select-all') continue;
      await visit(item);
    }
  }
};

export const collectModalMenuItems = async (submenu: Submenu) => {
  await walkSubmenu(submenu, async (item) => {
    modalMenuItems.push({ item, normallyEnabled: await item.isEnabled() });
  });
};

const collectModalMenuItemIds = async (submenu: Submenu) => {
  const ids = new Set<string>();
  await walkSubmenu(submenu, (item) => {
    ids.add(item.id);
  });
  return ids;
};

const closeMenuItemTree = async (item: MenuTreeItem) => {
  if (item instanceof Submenu) {
    for (const child of await item.items()) {
      await item.remove(child);
      await closeMenuItemTree(child);
    }
  }
  await item.close();
};

export const replaceSubmenuContents = async (target: Submenu, replacement: Submenu) => {
  const oldIds = await collectModalMenuItemIds(target);
  for (let index = modalMenuItems.length - 1; index >= 0; index--) {
    if (oldIds.has(modalMenuItems[index].item.id)) modalMenuItems.splice(index, 1);
  }

  for (const item of await target.items()) {
    await target.remove(item);
    await closeMenuItemTree(item);
  }

  await collectModalMenuItems(replacement);
  for (const item of await replacement.items()) {
    await replacement.remove(item);
    await target.append(item);
  }
  await replacement.close();

  if (modalMenuOpen) {
    const newIds = await collectModalMenuItemIds(target);
    await Promise.all(
      modalMenuItems
        .filter(({ item }) => newIds.has(item.id))
        .map(({ item }) => item.setEnabled(false)),
    );
  }
};

export const setModalMenuState = async (isOpen: boolean) => {
  if (isOpen === modalMenuOpen) return;
  modalMenuOpen = isOpen;
  await Promise.all(
    modalMenuItems.map(({ item, normallyEnabled }) => item.setEnabled(!isOpen && normallyEnabled)),
  );
};

/** the freshly built menu already carries the right enablement, so the flag is dropped without touching items */
export const resetModalMenuState = () => {
  modalMenuOpen = false;
};
