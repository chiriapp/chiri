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

describe('enableSystemTrayExplicitlySet round-trip', () => {
  it('preserves the explicit tray flag through export and import', async () => {
    const { exportSettings, importSettings } = await import('$context/settingsImportExport');
    const { defaultState } = await import('$context/settingsDefaults');

    const state = {
      ...defaultState,
      enableSystemTray: false,
      enableSystemTrayExplicitlySet: true,
    };

    const exported = exportSettings(state);
    const imported = importSettings(exported, defaultState);

    expect(imported).not.toBeNull();
    expect(imported?.enableSystemTray).toBe(false);
    expect(imported?.enableSystemTrayExplicitlySet).toBe(true);
  });

  it('defaults the explicit tray flag to false when missing from imported data', async () => {
    const { importSettings } = await import('$context/settingsImportExport');
    const { defaultState } = await import('$context/settingsDefaults');

    const exported = JSON.stringify({
      version: 1,
      enableSystemTray: true,
    });

    const imported = importSettings(exported, defaultState);

    expect(imported).not.toBeNull();
    expect(imported?.enableSystemTray).toBe(true);
    expect(imported?.enableSystemTrayExplicitlySet).toBe(false);
  });
});
