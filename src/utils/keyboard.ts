import type { KeyboardShortcut } from '$types';
import { isMacPlatform, isWindowsPlatform } from '$utils/platform';

type ShortcutPlatform = 'macos' | 'windows' | 'other';

export const getMetaKeyLabel = () => {
  return isMacPlatform() ? '⌘' : 'Ctrl';
};

export const getAltKeyLabel = () => {
  return isMacPlatform() ? '⌥' : 'Alt';
};

export const getShiftKeyLabel = () => {
  return 'Shift';
};

export const getSuperKeyLabel = () => {
  return isMacPlatform() ? '⌘' : 'Win';
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

export const normalizeShortcutKey = (key: string) => {
  if (key === 'Spacebar' || key.trim() === '') return ' ';
  return key;
};

export const getShortcutSignature = (shortcut: KeyboardShortcut | Partial<KeyboardShortcut>) => {
  if (!shortcut.key) return null;

  const normalizedKey = normalizeShortcutKey(shortcut.key);
  const key = normalizedKey.length === 1 ? normalizedKey.toLowerCase() : normalizedKey;
  return [
    key,
    shortcut.meta ? 'meta' : '',
    shortcut.ctrl ? 'ctrl' : '',
    shortcut.super ? 'super' : '',
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

const getShortcutPlatform = (): ShortcutPlatform => {
  if (isMacPlatform()) return 'macos';
  if (isWindowsPlatform()) return 'windows';
  return 'other';
};

// Native app/window menu shortcuts that should not be repurposed for Chiri actions.
const APP_MENU_RESERVED_SHORTCUT_SIGNATURES = new Set([
  getShortcutSignature({ key: 'q', meta: true }),
  getShortcutSignature({ key: 'w', meta: true }),
  getShortcutSignature({ key: 'w', meta: true, alt: true }),
  getShortcutSignature({ key: 'h', meta: true }),
  getShortcutSignature({ key: 'h', meta: true, alt: true }),
  getShortcutSignature({ key: 'm', meta: true }),
  getShortcutSignature({ key: 'm', meta: true, alt: true }),
  getShortcutSignature({ key: 'f', meta: true, ctrl: true }),
]);

// macOS-level shortcuts that should not be repurposed for Chiri actions.
// This intentionally does not include common document/editing commands like Cmd+F or Cmd+N.
const MACOS_RESERVED_SHORTCUT_SIGNATURES = new Set([
  getShortcutSignature({ key: 'Escape', meta: true, alt: true }),

  // System navigation and search
  getShortcutSignature({ key: 'Tab', meta: true }),
  getShortcutSignature({ key: '`', meta: true }),
  getShortcutSignature({ key: '`', meta: true, shift: true }),
  getShortcutSignature({ key: ' ', meta: true }),
  getShortcutSignature({ key: ' ', meta: true, alt: true }),
  getShortcutSignature({ key: ' ', meta: true, ctrl: true }),

  // Security/session and screenshots
  getShortcutSignature({ key: 'q', meta: true, ctrl: true }),
  getShortcutSignature({ key: 'q', meta: true, shift: true }),
  getShortcutSignature({ key: 'q', meta: true, shift: true, alt: true }),
  getShortcutSignature({ key: '3', meta: true, shift: true }),
  getShortcutSignature({ key: '4', meta: true, shift: true }),
  getShortcutSignature({ key: '5', meta: true, shift: true }),
]);

// Windows-level shortcuts that should not be repurposed for Chiri actions.
// Note that Chiri stores Ctrl as `meta` on Windows and the Windows key as `super`.
const WINDOWS_RESERVED_SHORTCUT_SIGNATURES = new Set([
  // Window/app switching and system menus
  getShortcutSignature({ key: 'F4', alt: true }),
  getShortcutSignature({ key: 'F4', meta: true }),
  getShortcutSignature({ key: ' ', alt: true }),
  getShortcutSignature({ key: 'Tab', alt: true }),
  getShortcutSignature({ key: 'Tab', alt: true, shift: true }),
  getShortcutSignature({ key: 'Tab', meta: true, alt: true }),
  getShortcutSignature({ key: 'Escape', alt: true }),
  getShortcutSignature({ key: 'Escape', meta: true }),

  // Security/session, task management, screenshots, and debugger keys
  getShortcutSignature({ key: 'Delete', meta: true, alt: true }),
  getShortcutSignature({ key: 'Escape', meta: true, shift: true }),
  getShortcutSignature({ key: 'PrintScreen' }),
  getShortcutSignature({ key: 'PrintScreen', alt: true }),
  getShortcutSignature({ key: 'F12' }),
]);

export const isReservedShortcut = (
  shortcut: KeyboardShortcut | Partial<KeyboardShortcut>,
  platform: ShortcutPlatform = getShortcutPlatform(),
) => {
  if (platform === 'other') return false;

  const signature = getShortcutSignature(shortcut);
  if (signature === null) return false;

  if (platform === 'windows') {
    return Boolean(shortcut.super) || WINDOWS_RESERVED_SHORTCUT_SIGNATURES.has(signature);
  }

  return (
    APP_MENU_RESERVED_SHORTCUT_SIGNATURES.has(signature) ||
    MACOS_RESERVED_SHORTCUT_SIGNATURES.has(signature)
  );
};

export const getReservedShortcutMessage = (
  shortcut: KeyboardShortcut | Partial<KeyboardShortcut>,
  platform: ShortcutPlatform = getShortcutPlatform(),
) => {
  if (platform === 'other') return null;

  const signature = getShortcutSignature(shortcut);
  if (signature === null) return null;

  if (platform === 'windows') {
    return shortcut.super || WINDOWS_RESERVED_SHORTCUT_SIGNATURES.has(signature)
      ? 'Reserved by Windows.'
      : null;
  }

  if (APP_MENU_RESERVED_SHORTCUT_SIGNATURES.has(signature)) {
    return 'Reserved by the app menu.';
  }

  return MACOS_RESERVED_SHORTCUT_SIGNATURES.has(signature) ? 'Reserved by macOS.' : null;
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
  if (shortcut.ctrl && (isMacPlatform() || !shortcut.meta)) parts.push('Ctrl');
  if (shortcut.super && !isMacPlatform()) parts.push(getSuperKeyLabel());
  if (shortcut.shift) parts.push(getShiftKeyLabel());
  if (shortcut.alt) parts.push(getAltKeyLabel());
  const normalizedKey = normalizeShortcutKey(shortcut.key);
  const keyDisplay =
    KEY_DISPLAY_NAMES[normalizedKey] ??
    (normalizedKey.length === 1 ? normalizedKey.toUpperCase() : normalizedKey);
  parts.push(keyDisplay);

  return parts.join(' + ');
};
