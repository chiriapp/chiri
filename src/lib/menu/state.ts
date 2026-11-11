import type { CheckMenuItem, MenuItem, Submenu } from '@tauri-apps/api/menu';

export type TrackedMenuItem = MenuItem | CheckMenuItem | Submenu;

export interface ModalMenuItem {
  item: TrackedMenuItem;
  normallyEnabled: boolean;
}

// store menu item references for updates
const trackedItems = new Map<string, TrackedMenuItem>();

export const trackMenuItem = <T extends TrackedMenuItem>(item: T) => {
  trackedItems.set(item.id, item);
  return item;
};

export const getTrackedMenuItem = (id: string) => trackedItems.get(id);

export const modalMenuItems: ModalMenuItem[] = [];

export const findModalMenuItem = (id: string) =>
  modalMenuItems.find((entry) => entry.item.id === id);

export const navigationMenuItems = new Map<string, CheckMenuItem>();

export const submenuRefs: { go?: Submenu; accounts?: Submenu } = {};

let submenuMutationQueue: Promise<void> = Promise.resolve();

/** serializes submenu replacements so overlapping updates can't interleave */
export const enqueueSubmenuMutation = (mutation: () => Promise<void>) => {
  const next = submenuMutationQueue.then(mutation, mutation);
  submenuMutationQueue = next.catch(() => {});
  return next;
};
