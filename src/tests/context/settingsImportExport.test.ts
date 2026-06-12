import { describe, expect, it, vi } from 'vitest';
import type { KeyboardShortcut } from '$types';

vi.mock('@tauri-apps/plugin-os', () => ({
  platform: () => 'macos',
}));

const shortcut = (overrides: Partial<KeyboardShortcut>): KeyboardShortcut => ({
  id: 'test-shortcut',
  key: 'n',
  description: 'Test shortcut',
  ...overrides,
});

describe('mergeShortcuts', () => {
  it('restores defaults for stored shortcuts reserved by macOS', async () => {
    const { mergeShortcuts } = await import('$context/settingsImportExport');
    const defaults = [shortcut({ id: 'new-task', key: 'n', meta: true })];
    const existing = [shortcut({ id: 'new-task', key: 'q', meta: true })];

    expect(mergeShortcuts(existing, defaults)).toEqual(defaults);
  });

  it('keeps non-reserved stored shortcuts', async () => {
    const { mergeShortcuts } = await import('$context/settingsImportExport');
    const defaults = [shortcut({ id: 'new-task', key: 'n', meta: true })];
    const existing = [shortcut({ id: 'new-task', key: 'j', meta: true })];

    expect(mergeShortcuts(existing, defaults)).toEqual(existing);
  });
});
