import type { KeyboardShortcut } from '$types';
import { isMacPlatform } from '$utils/platform';

export const getMetaKeyLabel = () => {
  return isMacPlatform() ? '⌘' : 'Ctrl';
};

export const getAltKeyLabel = () => {
  return isMacPlatform() ? '⌥' : 'Alt';
};

export const getShiftKeyLabel = () => {
  return 'Shift';
};

export const getModifierJoiner = () => {
  return isMacPlatform() ? '' : '+';
};

const KEY_DISPLAY_NAMES: Record<string, string> = {
  ' ': 'Space',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Escape: 'Esc',
};

export const getShortcutSignature = (shortcut: KeyboardShortcut | Partial<KeyboardShortcut>) => {
  if (!shortcut.key) return null;

  const key = shortcut.key.length === 1 ? shortcut.key.toLowerCase() : shortcut.key;
  return [
    key,
    shortcut.meta ? 'meta' : '',
    shortcut.ctrl ? 'ctrl' : '',
    shortcut.shift ? 'shift' : '',
    shortcut.alt ? 'alt' : '',
  ].join('|');
};

export const shortcutsConflict = (
  first: KeyboardShortcut | Partial<KeyboardShortcut>,
  second: KeyboardShortcut | Partial<KeyboardShortcut>,
) => {
  const firstSignature = getShortcutSignature(first);
  const secondSignature = getShortcutSignature(second);

  return firstSignature !== null && firstSignature === secondSignature;
};

export const keyboardShortcutsMatch = (
  shortcuts: KeyboardShortcut[],
  defaults: KeyboardShortcut[],
) => {
  if (shortcuts.length !== defaults.length) return false;

  const shortcutsById = new Map(shortcuts.map((shortcut) => [shortcut.id, shortcut]));

  return defaults.every((defaultShortcut) => {
    const shortcut = shortcutsById.get(defaultShortcut.id);
    return (
      shortcut !== undefined &&
      getShortcutSignature(shortcut) === getShortcutSignature(defaultShortcut)
    );
  });
};

export const formatShortcut = (shortcut: KeyboardShortcut | Partial<KeyboardShortcut>) => {
  if (!shortcut.key) return 'Not set';

  const parts: string[] = [];
  if (shortcut.meta) parts.push(getMetaKeyLabel());
  if (shortcut.ctrl && !shortcut.meta) parts.push('Ctrl');
  if (shortcut.shift) parts.push(getShiftKeyLabel());
  if (shortcut.alt) parts.push(getAltKeyLabel());
  const keyDisplay =
    KEY_DISPLAY_NAMES[shortcut.key] ??
    (shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key);
  parts.push(keyDisplay);

  return parts.join(' + ');
};
