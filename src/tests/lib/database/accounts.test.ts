import type DatabasePlugin from '@tauri-apps/plugin-sql';
import { describe, expect, it, vi } from 'vitest';
import { updateOAuthTokens } from '$lib/database/accounts';

const tokens = {
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
  tokenExpiry: '2026-10-19T01:00:00.000Z',
};

describe('OAuth account persistence', () => {
  it('updates tokens only when the stored refresh token is expected or already current', async () => {
    const execute = vi.fn().mockResolvedValue({ rowsAffected: 1 });
    const connection = { execute } as unknown as DatabasePlugin;

    await updateOAuthTokens(connection, 'account-1', 'old-refresh-token', tokens);

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('refresh_token = $5 OR refresh_token = $2'),
      [
        'new-access-token',
        'new-refresh-token',
        '2026-10-19T01:00:00.000Z',
        'account-1',
        'old-refresh-token',
      ],
    );
  });

  it('rejects a stale token update', async () => {
    const connection = {
      execute: vi.fn().mockResolvedValue({ rowsAffected: 0 }),
    } as unknown as DatabasePlugin;

    await expect(
      updateOAuthTokens(connection, 'account-1', 'stale-refresh-token', tokens),
    ).rejects.toThrow('OAuth tokens changed before they could be saved');
  });
});
