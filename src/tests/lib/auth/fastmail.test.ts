import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mocks.invoke,
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: vi.fn(),
}));

vi.mock('$lib/deepLink', () => ({
  registerDeepLinkHandler: vi.fn(),
  unregisterDeepLinkHandler: vi.fn(),
}));

import { FASTMAIL_CLIENT_ID, refreshFastmailToken } from '$lib/auth/fastmail';

describe('refreshFastmailToken', () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
  });

  it('exchanges a refresh token and requires Fastmail to rotate it', async () => {
    mocks.invoke.mockResolvedValueOnce({
      status: 200,
      headers: {},
      body: JSON.stringify({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      }),
    });

    const tokens = await refreshFastmailToken('old-refresh-token');

    expect(tokens).toEqual(
      expect.objectContaining({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      }),
    );
    expect(mocks.invoke).toHaveBeenCalledWith('http_request', {
      url: 'https://api.fastmail.com/oauth/refresh',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: FASTMAIL_CLIENT_ID,
        refresh_token: 'old-refresh-token',
      }).toString(),
      acceptInvalidCerts: false,
    });
  });

  it('rejects a successful response without a new refresh token', async () => {
    mocks.invoke.mockResolvedValueOnce({
      status: 200,
      headers: {},
      body: JSON.stringify({ access_token: 'new-access-token', expires_in: 3600 }),
    });

    await expect(refreshFastmailToken('old-refresh-token')).rejects.toThrow(
      'Token response is missing a valid refresh_token.',
    );
  });

  it('rejects a successful response that returns the consumed refresh token', async () => {
    mocks.invoke.mockResolvedValueOnce({
      status: 200,
      headers: {},
      body: JSON.stringify({
        access_token: 'new-access-token',
        refresh_token: 'old-refresh-token',
        expires_in: 3600,
      }),
    });

    await expect(refreshFastmailToken('old-refresh-token')).rejects.toThrow(
      'Token response did not rotate the refresh_token.',
    );
  });
});
