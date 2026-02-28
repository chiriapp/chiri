import type { KeyboardShortcut } from '@/types';
import { isMacPlatform } from './platform';

export function getMetaKeyLabel(): string {
  return isMacPlatform() ? '⌘' : 'Ctrl';
}

export function getAltKeyLabel(): string {
  return isMacPlatform() ? '⌥' : 'Alt';
}

export function getShiftKeyLabel(): string {
  return 'Shift';
}

export function getModifierJoiner(): string {
  return isMacPlatform() ? '' : '+';
}

export function formatShortcut(shortcut: KeyboardShortcut | Partial<KeyboardShortcut>): string {
  const parts: string[] = [];
  if (shortcut.meta) parts.push(getMetaKeyLabel());
  if (shortcut.ctrl && !shortcut.meta) parts.push('Ctrl');
  if (shortcut.shift) parts.push(getShiftKeyLabel());
  if (shortcut.alt) parts.push(getAltKeyLabel());
  if (shortcut.key) {
    const keyDisplay =
      shortcut.key === ' '
        ? 'Space'
        : shortcut.key.length === 1
          ? shortcut.key.toUpperCase()
          : shortcut.key;
    parts.push(keyDisplay);
  }
  return parts.join(' + ') || 'Press keys...';
}
