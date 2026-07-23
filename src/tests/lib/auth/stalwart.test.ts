import { atob, btoa } from 'node:buffer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  openUrl: vi.fn(() => Promise.resolve()),
  deepLinkHandlers: new Map<string, (url: URL) => void>(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mocks.invoke,
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: mocks.openUrl,
}));

vi.mock('$lib/deepLink', () => ({
  registerDeepLinkHandler: (path: string, handler: (url: URL) => void) => {
    mocks.deepLinkHandlers.set(path, handler);
  },
  unregisterDeepLinkHandler: (path: string) => {
    mocks.deepLinkHandlers.delete(path);
  },
}));

import {
  discoverStalwartOAuthEndpoints,
  refreshStalwartToken,
  registerStalwartOAuthClient,
  STALWART_OAUTH_PATH,
  STALWART_REDIRECT_URI,
  startStalwartOAuth,
  usernameFromPrincipalUrl,
} from '$lib/auth/stalwart';

// Provide atob/btoa for JWT decoding in the test environment
globalThis.atob = atob;
globalThis.btoa = btoa;

describe('discoverStalwartOAuthEndpoints', () => {
  it('parses OIDC metadata', async () => {
    mocks.invoke.mockResolvedValueOnce({
      status: 200,
      body: JSON.stringify({
        issuer: 'http://localhost:8083',
        authorization_endpoint: 'http://localhost:8083/login',
        token_endpoint: 'http://localhost:8083/auth/token',
        registration_endpoint: 'http://localhost:8083/auth/register',
        device_authorization_endpoint: 'http://localhost:8083/auth/device',
      }),
    });

    const endpoints = await discoverStalwartOAuthEndpoints('http://localhost:8083');
    expect(endpoints).toEqual({
      issuer: 'http://localhost:8083',
      authorization_endpoint: 'http://localhost:8083/login',
      token_endpoint: 'http://localhost:8083/auth/token',
      registration_endpoint: 'http://localhost:8083/auth/register',
      device_authorization_endpoint: 'http://localhost:8083/auth/device',
    });
  });

  it('throws when metadata is missing required endpoints', async () => {
    mocks.invoke.mockResolvedValueOnce({
      status: 200,
      body: JSON.stringify({ issuer: 'http://localhost:8083' }),
    });

    await expect(discoverStalwartOAuthEndpoints('http://localhost:8083')).rejects.toThrow(
      'missing authorization_endpoint or token_endpoint',
    );
  });
});

describe('registerStalwartOAuthClient', () => {
  it('returns the registered client id', async () => {
    mocks.invoke.mockResolvedValueOnce({
      status: 201,
      body: JSON.stringify({
        client_id: 'swc1.test',
        redirect_uris: [STALWART_REDIRECT_URI],
      }),
    });

    const clientId = await registerStalwartOAuthClient('http://localhost:8083/auth/register');
    expect(clientId).toBe('swc1.test');
    expect(mocks.invoke).toHaveBeenCalledWith(
      'http_request',
      expect.objectContaining({
        url: 'http://localhost:8083/auth/register',
        method: 'POST',
      }),
    );
  });
});

describe('refreshStalwartToken', () => {
  it('exchanges a refresh token for a new access token', async () => {
    mocks.invoke
      .mockResolvedValueOnce({
        status: 200,
        body: JSON.stringify({
          issuer: 'http://localhost:8083',
          authorization_endpoint: 'http://localhost:8083/login',
          token_endpoint: 'http://localhost:8083/auth/token',
        }),
      })
      .mockResolvedValueOnce({
        status: 200,
        body: JSON.stringify({
          access_token: 'new-access-token',
          token_type: 'bearer',
          expires_in: 3600,
        }),
      });

    const tokens = await refreshStalwartToken(
      'http://localhost:8083',
      'refresh-token',
      'client-id',
    );

    expect(tokens.accessToken).toBe('new-access-token');
    expect(tokens.refreshToken).toBe('refresh-token');
    expect(tokens.tokenExpiry).toBeDefined();
  });
});

describe('usernameFromPrincipalUrl', () => {
  it('extracts the email from a Stalwart principal URL', () => {
    expect(usernameFromPrincipalUrl('http://localhost:8083/dav/pal/unit-tests@example.test/')).toBe(
      'unit-tests@example.test',
    );
  });
});

describe('startStalwartOAuth', () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
    mocks.openUrl.mockReset();
    mocks.deepLinkHandlers.clear();
  });

  it('completes the full authorization code flow', async () => {
    const idTokenPayload = btoa(
      JSON.stringify({
        preferred_username: 'unit-tests@example.test',
      }),
    );
    const idToken = `header.${idTokenPayload}.signature`;

    mocks.invoke
      .mockResolvedValueOnce({
        status: 200,
        body: JSON.stringify({
          issuer: 'http://localhost:8083',
          authorization_endpoint: 'http://localhost:8083/login',
          token_endpoint: 'http://localhost:8083/auth/token',
          registration_endpoint: 'http://localhost:8083/auth/register',
        }),
      })
      .mockResolvedValueOnce({
        status: 201,
        body: JSON.stringify({ client_id: 'swc1.test' }),
      })
      .mockResolvedValueOnce({
        status: 200,
        body: JSON.stringify({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
          id_token: idToken,
        }),
      });

    const promise = startStalwartOAuth('http://localhost:8083');

    await vi.waitFor(() => expect(mocks.openUrl).toHaveBeenCalledTimes(1));

    const openedUrl = (mocks.openUrl.mock.calls[0] as unknown as [string])[0];
    expect(openedUrl).toMatch(/^http:\/\/localhost:8083\/login\?/);
    expect(openedUrl).toContain('response_type=code');
    expect(openedUrl).toContain('client_id=swc1.test');
    expect(openedUrl).toContain(`redirect_uri=${encodeURIComponent(STALWART_REDIRECT_URI)}`);
    expect(openedUrl).toContain('scope=openid');
    expect(openedUrl).toContain('offline_access');
    expect(openedUrl).toContain('urn%3Aietf%3Aparams%3Aoauth%3Ascope%3Acalendars');
    expect(openedUrl).toContain('code_challenge=');
    expect(openedUrl).toContain('code_challenge_method=S256');

    const url = new URL(openedUrl);
    const state = url.searchParams.get('state');
    expect(state).toBeTruthy();

    const handler = mocks.deepLinkHandlers.get(STALWART_OAUTH_PATH);
    expect(handler).toBeDefined();

    handler?.(new URL(`garden.chiri:/oauth/stalwart?code=abc123&state=${state}`));

    const tokens = await promise;
    expect(tokens.accessToken).toBe('access-token');
    expect(tokens.refreshToken).toBe('refresh-token');
    expect(tokens.username).toBe('unit-tests@example.test');
    expect(tokens.clientId).toBe('swc1.test');
  });
});
