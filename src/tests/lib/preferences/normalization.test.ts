import { describe, expect, it, vi } from 'vitest';
import { defaultState } from '$context/settingsDefaults';
import { normalizePreferences } from '$lib/preferences/normalization';
import { DEFAULT_NTFY_SERVER_URL } from '$lib/push/providers/ntfy';

vi.mock('@tauri-apps/plugin-os', () => ({
  platform: () => 'macos',
}));

describe('preference normalization', () => {
  it('leaves current preferences unchanged', () => {
    const result = normalizePreferences(defaultState, defaultState);

    expect(result.state).toEqual(defaultState);
    expect(result.migrated).toBe(false);
    expect(result.shortcutMigration).toBeUndefined();
  });

  it('removes retired preferences and fills current defaults', () => {
    const result = normalizePreferences(
      {
        theme: 'dark',
        confirmBeforeDelete: false,
      },
      defaultState,
    );

    expect(result.state.theme).toBe('dark');
    expect(result.state.autoSync).toBe(defaultState.autoSync);
    expect(result.state).not.toHaveProperty('confirmBeforeDelete');
    expect(result.migrated).toBe(true);
  });

  it('normalizes legacy structured values', () => {
    const result = normalizePreferences(
      {
        networkProxyPort: 8080,
        ntfyServerUrl: DEFAULT_NTFY_SERVER_URL,
        quickTimePresets: [540, 720, 1020, 1260],
        taskBadgeVisibility: { status: false },
      },
      defaultState,
    );

    expect(result.state.networkProxyPort).toBe('');
    expect(result.state.ntfyServerUrl).toBe('');
    expect(result.state.quickTimePresets).toEqual(defaultState.quickTimePresets);
    expect(result.state.taskBadgeVisibility).toEqual({
      ...defaultState.taskBadgeVisibility,
      status: false,
    });
    expect(result.migrated).toBe(true);
  });

  it('reports shortcut migrations for logging', () => {
    const result = normalizePreferences({ keyboardShortcuts: [] }, defaultState);

    expect(result.state.keyboardShortcuts).toEqual(defaultState.keyboardShortcuts);
    expect(result.shortcutMigration).toMatchObject({
      originalLength: 0,
      newLength: defaultState.keyboardShortcuts.length,
      removedIds: [],
      changedIds: [],
    });
    expect(result.migrated).toBe(true);
  });
});
