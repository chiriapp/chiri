/**
 * Stalwart OAuth 2.0 + PKCE authentication
 *
 * flow:
 *  1. discover OIDC/OAuth endpoints from serverUrl/.well-known/openid-configuration
 *  2. register a public PKCE client dynamically (Stalwart allows this by default)
 *  3. open browser to the authorization endpoint
 *  4. Stalwart redirects to garden.chiri:/oauth/stalwart?code=...&state=...
 *  5. exchange code + verifier for access + refresh tokens
 *  6. derive username from the OIDC id_token's preferred_username/email claim
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

export const STALWART_REDIRECT_URI = 'garden.chiri:/oauth/stalwart';
export const STALWART_SCOPE = 'openid offline_access urn:ietf:params:oauth:scope:calendars';
export const STALWART_OAUTH_PATH = '/oauth/stalwart';

export interface StalwartTokens extends OAuthTokens {
  /** Account identifier returned by the OIDC id_token (preferred_username or email) */
  username: string;
  /** Public client_id used to obtain the refresh token; must be reused on refresh */
  clientId: string;
}

interface OAuthMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  device_authorization_endpoint?: string;
}

interface ClientRegistrationResponse {
  client_id: string;
  client_secret?: string;
  client_id_issued_at?: number;
  redirect_uris?: string[];
}

const normalizeServerUrl = (serverUrl: string): string => serverUrl.trim().replace(/\/$/, '');

export const discoverStalwartOAuthEndpoints = async (
  serverUrl: string,
  acceptInvalidCerts = false,
): Promise<OAuthMetadata> => {
  const base = normalizeServerUrl(serverUrl);
  const metadataUrl = `${base}/.well-known/openid-configuration`;

  const res = await invoke<HttpResponse>('http_request', {
    url: metadataUrl,
    method: 'GET',
    headers: { Accept: 'application/json' },
    body: undefined,
    acceptInvalidCerts,
  });

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Failed to discover Stalwart OAuth endpoints (${res.status}): ${res.body}`);
  }

  const metadata = JSON.parse(res.body) as OAuthMetadata;
  if (!metadata.authorization_endpoint || !metadata.token_endpoint) {
    throw new Error('Stalwart OAuth metadata is missing authorization_endpoint or token_endpoint');
  }

  return metadata;
};

export const registerStalwartOAuthClient = async (
  registrationEndpoint: string,
  acceptInvalidCerts = false,
): Promise<string> => {
  const res = await invoke<HttpResponse>('http_request', {
    url: registrationEndpoint,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Chiri',
      redirect_uris: [STALWART_REDIRECT_URI],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: STALWART_SCOPE,
    }),
    acceptInvalidCerts,
  });

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Failed to register Stalwart OAuth client (${res.status}): ${res.body}`);
  }

  const data = JSON.parse(res.body) as ClientRegistrationResponse;
  if (!data.client_id) {
    throw new Error('Stalwart OAuth client registration did not return a client_id');
  }

  return data.client_id;
};

export const startStalwartOAuth = async (
  serverUrl: string,
  { acceptInvalidCerts = false }: { acceptInvalidCerts?: boolean } = {},
): Promise<StalwartTokens> => {
  const metadata = await discoverStalwartOAuthEndpoints(serverUrl, acceptInvalidCerts);
  const registrationEndpoint =
    metadata.registration_endpoint ?? `${normalizeServerUrl(serverUrl)}/auth/register`;
  const clientId = await registerStalwartOAuthClient(registrationEndpoint, acceptInvalidCerts);

  const verifier = generateVerifier();
  const challenge = await generateChallenge(verifier);
  const state = generateState();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: STALWART_REDIRECT_URI,
    scope: STALWART_SCOPE,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });

  const authUrl = `${metadata.authorization_endpoint}?${params}`;
  log.info('[StalwartOAuth] Opening browser for authorization', { serverUrl });

  const { promise, resolve, reject } = Promise.withResolvers<StalwartTokens>();

  const handler = async (url: URL) => {
    unregisterDeepLinkHandler(STALWART_OAUTH_PATH);

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
      log.info('[StalwartOAuth] Exchanging code for tokens');
      const tokens = await exchangeStalwartCode(
        metadata.token_endpoint,
        clientId,
        code,
        verifier,
        acceptInvalidCerts,
      );
      resolve({ ...tokens, clientId });
    } catch (e) {
      reject(e);
    }
  };

  registerDeepLinkHandler(STALWART_OAUTH_PATH, handler);

  openUrl(authUrl).catch((e: unknown) => {
    unregisterDeepLinkHandler(STALWART_OAUTH_PATH);
    reject(new Error(`Failed to open browser: ${e}`));
  });

  return promise;
};

const exchangeStalwartCode = async (
  tokenEndpoint: string,
  clientId: string,
  code: string,
  verifier: string,
  acceptInvalidCerts: boolean,
): Promise<OAuthTokens & { username: string }> => {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    code,
    redirect_uri: STALWART_REDIRECT_URI,
    code_verifier: verifier,
  });

  const res = await invoke<HttpResponse>('http_request', {
    url: tokenEndpoint,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    acceptInvalidCerts,
  });

  assertTokenResponseOk(res, 'Token exchange');

  const data = JSON.parse(res.body) as Record<string, unknown>;
  const base = parseTokenResponse(data);
  const username = usernameFromTokenResponse(data);

  return { ...base, username };
};

export const refreshStalwartToken = async (
  serverUrl: string,
  refreshToken: string,
  clientId: string,
  { acceptInvalidCerts = false }: { acceptInvalidCerts?: boolean } = {},
): Promise<OAuthTokens> => {
  const metadata = await discoverStalwartOAuthEndpoints(serverUrl, acceptInvalidCerts);
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refreshToken,
    scope: STALWART_SCOPE,
  });

  const res = await invoke<HttpResponse>('http_request', {
    url: metadata.token_endpoint,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    acceptInvalidCerts,
  });

  assertTokenResponseOk(res, 'Token refresh');

  const data = JSON.parse(res.body) as Record<string, unknown>;
  return parseTokenResponse(data, refreshToken);
};

const usernameFromTokenResponse = (data: Record<string, unknown>): string => {
  const idToken = data.id_token as string | undefined;
  if (!idToken) return '';

  try {
    const payload = JSON.parse(decodeJwtPayload(idToken)) as Record<string, unknown>;
    return (
      (payload.preferred_username as string | undefined) ||
      (payload.email as string | undefined) ||
      ''
    );
  } catch {
    return '';
  }
};

const decodeJwtPayload = (token: string): string => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const rawPayload = parts[1];
  const padding = '='.repeat((4 - (rawPayload.length % 4)) % 4);
  return atob((rawPayload + padding).replace(/-/g, '+').replace(/_/g, '/'));
};

/**
 * extract the username (email) from a Stalwart CalDAV principal URL
 * Stalwart principal URLs look like:
 *   http://localhost:8082/dav/pal/unit-tests@example.test/
 */
export const usernameFromPrincipalUrl = (principalUrl: string) => {
  const segment = principalUrl.replace(/\/$/, '').split('/').pop() ?? '';
  if (segment.includes('@')) return segment;
  return segment;
};
