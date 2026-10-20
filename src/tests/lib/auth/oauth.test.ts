import { describe, expect, it, vi } from 'vitest';
import {
  assertTokenResponseOk,
  OAuthTokenEndpointError,
  parseTokenResponse,
} from '$lib/auth/oauth';

describe('parseTokenResponse', () => {
  it('parses and normalizes a valid token response', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T12:00:00.000Z'));

    try {
      expect(
        parseTokenResponse({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
        }),
      ).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        tokenExpiry: '2026-10-19T13:00:00.000Z',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('allows a provider to retain an existing refresh token', () => {
    const tokens = parseTokenResponse(
      { access_token: 'access-token' },
      { fallbackRefreshToken: 'existing-refresh-token' },
    );

    expect(tokens.refreshToken).toBe('existing-refresh-token');
  });

  it.each([
    [null, 'Token response must be a JSON object.'],
    [{}, 'Token response is missing a valid access_token.'],
    [{ access_token: '' }, 'Token response is missing a valid access_token.'],
    [
      { access_token: 'access-token', refresh_token: '' },
      'Token response contains an invalid refresh_token.',
    ],
    [
      { access_token: 'access-token', refresh_token: 'refresh-token', expires_in: '3600' },
      'Token response contains an invalid expires_in value.',
    ],
  ])('rejects an invalid token response %#', (response, message) => {
    expect(() => parseTokenResponse(response)).toThrow(message);
  });

  it('rejects a missing refresh token when there is no provider fallback', () => {
    expect(() => parseTokenResponse({ access_token: 'access-token' })).toThrow(
      'Token response is missing a valid refresh_token.',
    );
  });

  it('rejects a refresh token that was not rotated when rotation is required', () => {
    expect(() =>
      parseTokenResponse(
        { access_token: 'access-token', refresh_token: 'consumed-refresh-token' },
        { requireRotatedRefreshTokenFrom: 'consumed-refresh-token' },
      ),
    ).toThrow('Token response did not rotate the refresh_token.');
  });
});

describe('assertTokenResponseOk', () => {
  it('parses structured OAuth errors including Fastmail temporary grants', () => {
    const response = {
      status: 400,
      headers: {},
      body: JSON.stringify({
        error: 'invalid_grant',
        error_description: 'This account is temporarily locked.',
        temporary: true,
      }),
    };

    try {
      assertTokenResponseOk(response, 'Token refresh');
      expect.unreachable('Expected the token endpoint error to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(OAuthTokenEndpointError);
      expect(error).toMatchObject({
        error: 'invalid_grant',
        errorDescription: 'This account is temporarily locked.',
        temporary: true,
        status: 400,
      });
      expect((error as Error).message).toBe(
        'Token refresh failed (400): This account is temporarily locked.',
      );
    }
  });

  it('keeps a useful fallback for non-OAuth error responses', () => {
    expect(() =>
      assertTokenResponseOk(
        { status: 502, headers: {}, body: '<html><body>upstream failed</body></html>' },
        'Token refresh',
      ),
    ).toThrow('Token refresh failed (502): upstream failed');
  });
});
