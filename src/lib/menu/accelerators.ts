import type { KeyboardShortcut } from '$types/shortcuts';
import { isMacPlatform } from '$utils/platform';

/**
 * converts a KeyboardShortcut to Tauri accelerator format
 */
export const shortcutToAccelerator = (shortcut?: KeyboardShortcut) => {
  if (!shortcut?.key) return undefined;
  if (shortcut.super) return undefined;

  const parts: string[] = [];

  if (shortcut.meta) parts.push('CmdOrCtrl');
  if (shortcut.ctrl && (isMacPlatform() || !shortcut.meta)) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');

  // map special keys
  const keyMap: Record<string, string> = {
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    ' ': 'Space',
  };
  parts.push(keyMap[shortcut.key] ?? shortcut.key.toUpperCase());

  return parts.join('+');
};

export const getAcceleratorOrDefault = (
  shortcuts: KeyboardShortcut[] | undefined,
  id: string,
  defaultAccelerator: string,
) => {
  const shortcut = shortcuts?.find((s) => s.id === id);
  if (!shortcut) return defaultAccelerator;

  return shortcutToAccelerator(shortcut);
};
