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

import {
  FASTMAIL_CLIENT_ID,
  refreshFastmailToken,
  revokeFastmailAuthorization,
} from '$lib/auth/fastmail';

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

  it('preserves Fastmail structured refresh errors', async () => {
    mocks.invoke.mockResolvedValueOnce({
      status: 400,
      headers: {},
      body: JSON.stringify({
        error: 'invalid_grant',
        error_description: 'Your administrator has temporarily locked this account.',
        temporary: true,
      }),
    });

    await expect(refreshFastmailToken('old-refresh-token')).rejects.toMatchObject({
      name: 'OAuthTokenEndpointError',
      error: 'invalid_grant',
      errorDescription: 'Your administrator has temporarily locked this account.',
      temporary: true,
      status: 400,
    });
  });
});

describe('revokeFastmailAuthorization', () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
  });

  it('revokes the grant with the current bearer access token', async () => {
    mocks.invoke.mockResolvedValueOnce({ status: 204, headers: {}, body: '' });

    await revokeFastmailAuthorization({
      accessToken: 'current-access-token',
      refreshToken: 'current-refresh-token',
    });

    expect(mocks.invoke).toHaveBeenCalledWith('http_request', {
      url: 'https://api.fastmail.com/oauth/revoke',
      method: 'POST',
      headers: { Authorization: 'Bearer current-access-token' },
      body: undefined,
      acceptInvalidCerts: false,
    });
  });

  it('refreshes once after a 401 and revokes with the rotated access token', async () => {
    mocks.invoke
      .mockResolvedValueOnce({ status: 401, headers: {}, body: '' })
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        body: JSON.stringify({
          access_token: 'fresh-access-token',
          refresh_token: 'rotated-refresh-token',
          expires_in: 3600,
        }),
      })
      .mockResolvedValueOnce({ status: 204, headers: {}, body: '' });

    await revokeFastmailAuthorization({
      accessToken: 'expired-access-token',
      refreshToken: 'current-refresh-token',
    });

    expect(mocks.invoke).toHaveBeenNthCalledWith(2, 'http_request', {
      url: 'https://api.fastmail.com/oauth/refresh',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: FASTMAIL_CLIENT_ID,
        refresh_token: 'current-refresh-token',
      }).toString(),
      acceptInvalidCerts: false,
    });
    expect(mocks.invoke).toHaveBeenNthCalledWith(3, 'http_request', {
      url: 'https://api.fastmail.com/oauth/revoke',
      method: 'POST',
      headers: { Authorization: 'Bearer fresh-access-token' },
      body: undefined,
      acceptInvalidCerts: false,
    });
  });

  it('refreshes once before revoking when only a refresh token remains', async () => {
    mocks.invoke
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        body: JSON.stringify({
          access_token: 'fresh-access-token',
          refresh_token: 'rotated-refresh-token',
          expires_in: 3600,
        }),
      })
      .mockResolvedValueOnce({ status: 204, headers: {}, body: '' });

    await revokeFastmailAuthorization({ refreshToken: 'current-refresh-token' });

    expect(mocks.invoke).toHaveBeenNthCalledWith(1, 'http_request', {
      url: 'https://api.fastmail.com/oauth/refresh',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: FASTMAIL_CLIENT_ID,
        refresh_token: 'current-refresh-token',
      }).toString(),
      acceptInvalidCerts: false,
    });
    expect(mocks.invoke).toHaveBeenNthCalledWith(2, 'http_request', {
      url: 'https://api.fastmail.com/oauth/revoke',
      method: 'POST',
      headers: { Authorization: 'Bearer fresh-access-token' },
      body: undefined,
      acceptInvalidCerts: false,
    });
  });

  it('does not consume the refresh token for non-401 revocation failures', async () => {
    mocks.invoke.mockResolvedValueOnce({ status: 500, headers: {}, body: '' });

    await expect(
      revokeFastmailAuthorization({
        accessToken: 'current-access-token',
        refreshToken: 'current-refresh-token',
      }),
    ).rejects.toMatchObject({ name: 'FastmailRevocationError', status: 500 });
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the local authorization was already cleared', async () => {
    await revokeFastmailAuthorization({});
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
