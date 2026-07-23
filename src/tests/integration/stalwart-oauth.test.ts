import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPredefinedServerUrl } from '$constants/settings';
import { CalDAVClient } from '$lib/caldav';
import { fetchCalendars } from '$lib/caldav/calendars';
import type { ServerType } from '$types';

const url = process.env.CHIRI_TEST_CALDAV_URL;
const username = process.env.CHIRI_TEST_CALDAV_USERNAME;
const password = process.env.CHIRI_TEST_CALDAV_PASSWORD;
const serverType = (process.env.CHIRI_TEST_CALDAV_TYPE ?? 'generic') as ServerType;

const shouldRun = serverType === 'stalwart' && !!url && !!username && !!password;
const integration = shouldRun ? describe : describe.skip;

const generatePKCE = async () => {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = btoa(String.fromCharCode(...verifierBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return { verifier, challenge };
};

const normalizeServerUrl = (raw: string) => raw.replace(/\/$/, '');

integration('Stalwart OAuth CalDAV end-to-end', () => {
  let serverUrl: string;
  let clientId: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    serverUrl = normalizeServerUrl(getPredefinedServerUrl('stalwart') ?? url!);

    // Discover OAuth endpoints
    const metadataRes = await fetch(`${serverUrl}/.well-known/oauth-authorization-server`);
    expect(metadataRes.status).toBe(200);
    const metadata = (await metadataRes.json()) as {
      registration_endpoint: string;
      authorization_endpoint: string;
      token_endpoint: string;
    };

    // Register a public OAuth client dynamically
    const registrationRes = await fetch(metadata.registration_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        redirect_uris: ['garden.chiri:/oauth/stalwart'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
        scope: 'openid offline_access urn:ietf:params:oauth:scope:calendars',
      }),
    });
    expect(registrationRes.status).toBe(201);
    const registration = (await registrationRes.json()) as { client_id: string };
    clientId = registration.client_id;

    // Generate PKCE parameters
    const { verifier, challenge } = await generatePKCE();

    // Obtain an authorization code via Stalwart's programmatic login endpoint
    const codeRes = await fetch(`${serverUrl}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        type: 'authCode',
        accountName: username,
        accountSecret: password,
        clientId,
        redirectUri: 'garden.chiri:/oauth/stalwart',
        scope: 'openid offline_access urn:ietf:params:oauth:scope:calendars',
        codeChallenge: challenge,
        codeChallengeMethod: 'S256',
      }),
    });
    const codeJson = (await codeRes.json()) as { type?: string; client_code?: string };
    expect(codeRes.status).toBe(200);
    const { client_code: code } = codeJson as { client_code: string };

    // Exchange the code for access and refresh tokens
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: 'garden.chiri:/oauth/stalwart',
      code_verifier: verifier,
    });
    const tokenRes = await fetch(metadata.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });
    expect(tokenRes.status).toBe(200);
    const tokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
    };
    accessToken = tokens.access_token;
    refreshToken = tokens.refresh_token;
  }, 60_000);

  afterAll(async () => {
    // No server-side cleanup needed; dynamic clients and codes are transient.
  });

  it('connects via Bearer token and discovers calendars', async () => {
    const { principalUrl, displayName } = await CalDAVClient.connectWithBearer(
      'stalwart-oauth-test',
      serverUrl,
      username!,
      accessToken,
      'stalwart',
    );

    expect(principalUrl).toBeTruthy();
    expect(displayName).toBeTruthy();

    const calendars = await fetchCalendars(
      {
        serverUrl,
        credentials: { username: username!, password: '', bearerToken: accessToken },
        principalUrl,
        calendarHome: principalUrl,
        serverType: 'stalwart',
      },
      'stalwart-oauth-test',
    );

    expect(Array.isArray(calendars)).toBe(true);
  }, 60_000);

  it('refresh token yields a new access token', async () => {
    const refreshBody = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
      scope: 'openid offline_access urn:ietf:params:oauth:scope:calendars',
    });

    const metadataRes = await fetch(`${serverUrl}/.well-known/oauth-authorization-server`);
    const metadata = (await metadataRes.json()) as { token_endpoint: string };

    const tokenRes = await fetch(metadata.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: refreshBody.toString(),
    });
    expect(tokenRes.status).toBe(200);
    const tokens = (await tokenRes.json()) as { access_token: string };
    expect(tokens.access_token).toBeTruthy();
    expect(tokens.access_token).not.toBe(accessToken);
  }, 60_000);
});
