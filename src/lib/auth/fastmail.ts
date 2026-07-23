/**
 * Fastmail OAuth 2.0 + PKCE authentication
 *
 * flow:
 *  1. Generate PKCE verifier + S256 challenge + random state
 *  2. Open browser to Fastmail's auth endpoint
 *  3. Fastmail redirects to garden.chiri:/oauth/fastmail?code=...&state=...
 *  4. Exchange code + verifier for access + refresh tokens
 *  5. Derive username from CalDAV principal URL
 */

import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import {
  assertTokenResponseOk,
  generateChallenge,
  generateState,
  generateVerifier,
  type OAuthTokens,
  parseTokenResponse,
} from '$lib/auth/oauth';
import { registerDeepLinkHandler, unregisterDeepLinkHandler } from '$lib/deepLink';
import type { HttpResponse } from '$lib/http';
import { loggers } from '$lib/logger';

const log = loggers.account;

export const FASTMAIL_CLIENT_ID = '24f641ae';
export const FASTMAIL_REDIRECT_URI = 'garden.chiri:/oauth/fastmail';
export const FASTMAIL_SCOPE = 'https://www.fastmail.com/dev/protocol-caldav';
export const FASTMAIL_CALDAV_URL = 'https://caldav.fastmail.com';

const AUTH_URL = 'https://api.fastmail.com/oauth/authorize';
const TOKEN_URL = 'https://api.fastmail.com/oauth/refresh';

const OAUTH_PATH = '/oauth/fastmail';

// public types
export type FastmailTokens = OAuthTokens;

// main oauth flow: returns a Promise that resolves when the callback fires

export const startFastmailOAuth = async (): Promise<FastmailTokens> => {
  const verifier = generateVerifier();
  const challenge = await generateChallenge(verifier);
  const state = generateState(); // random nonce to prevent CSRF

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: FASTMAIL_CLIENT_ID,
    redirect_uri: FASTMAIL_REDIRECT_URI,
    scope: FASTMAIL_SCOPE,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });

  const authUrl = `${AUTH_URL}?${params}`;
  log.info('[FastmailOAuth] Opening browser for authorization');

  const { promise, resolve, reject } = Promise.withResolvers<FastmailTokens>();

  const handler = async (url: URL) => {
    // clean up before doing anything async so a second stray callback can't fire
    unregisterDeepLinkHandler(OAUTH_PATH);

    const returnedState = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    if (error) {
      reject(new Error(errorDescription ? `${error}: ${errorDescription}` : error));
      return;
    }

    if (returnedState !== state) {
      reject(new Error('OAuth state mismatch (possible CSRF)'));
      return;
    }

    if (!code) {
      reject(new Error('No authorization code received'));
      return;
    }

    try {
      log.info('[FastmailOAuth] Exchanging code for tokens');
      const tokens = await exchangeCodeForTokens(code, verifier);
      resolve(tokens);
    } catch (e) {
      reject(e);
    }
  };

  registerDeepLinkHandler(OAUTH_PATH, handler);

  openUrl(authUrl).catch((e: unknown) => {
    unregisterDeepLinkHandler(OAUTH_PATH);
    reject(new Error(`Failed to open browser: ${e}`));
  });

  return promise;
};

// token exchange

const exchangeCodeForTokens = async (code: string, verifier: string) => {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: FASTMAIL_CLIENT_ID,
    code,
    redirect_uri: FASTMAIL_REDIRECT_URI,
    code_verifier: verifier,
  });

  // route through http_request (pure Rust reqwest) to avoid the WebView
  // adding an Origin header that Fastmail's token endpoint rejects
  const res = await invoke<HttpResponse>('http_request', {
    url: TOKEN_URL,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    acceptInvalidCerts: false,
  });

  assertTokenResponseOk(res, 'Token exchange');

  const data = JSON.parse(res.body) as Record<string, unknown>;
  return parseTokenResponse(data);
};

export const refreshFastmailToken = async (refreshToken: string): Promise<FastmailTokens> => {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: FASTMAIL_CLIENT_ID,
    refresh_token: refreshToken,
  });

  const res = await invoke<HttpResponse>('http_request', {
    url: TOKEN_URL,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    acceptInvalidCerts: false,
  });

  assertTokenResponseOk(res, 'Token refresh');

  const data = JSON.parse(res.body) as Record<string, unknown>;
  // some servers rotate the refresh token; fall back to the existing one if not
  return parseTokenResponse(data, refreshToken);
};

/**
 * extract the username (email) from a Fastmail CalDAV principal URL
 * Fastmail principal URLs look like:
 *   https://caldav.fastmail.com/dav/principals/user/user@fastmail.com/
 */
export const usernameFromPrincipalUrl = (principalUrl: string) => {
  const segment = principalUrl.replace(/\/$/, '').split('/').pop() ?? '';
  // principal path segments use the email address; return it if it looks like one
  if (segment.includes('@')) return segment;
  // fall back to the raw segment (shouldn't happen with Fastmail)
  return segment;
};
