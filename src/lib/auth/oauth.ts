/**
 * shared OAuth 2.0 + PKCE helpers used by multiple provider flows
 */

import type { HttpResponse } from '$lib/http';

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  /** ISO timestamp of when the access token expires */
  tokenExpiry: string;
}

export const base64UrlEncode = (buf: Uint8Array): string => {
  const bytes = Array.from(buf, (b) => String.fromCharCode(b));
  return btoa(bytes.join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

export const generateVerifier = (): string => {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return base64UrlEncode(buf);
};

export const generateChallenge = async (verifier: string): Promise<string> => {
  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return base64UrlEncode(new Uint8Array(digest));
};

export const generateState = (): string => generateVerifier();

export const parseTokenResponse = (
  data: Record<string, unknown>,
  fallbackRefreshToken?: string,
): OAuthTokens => {
  const accessToken = data.access_token as string;
  const refreshToken = (data.refresh_token as string | undefined) ?? fallbackRefreshToken ?? '';
  const expiresIn = (data.expires_in as number | undefined) ?? 3600;
  const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();
  return { accessToken, refreshToken, tokenExpiry };
};

export const assertTokenResponseOk = (res: HttpResponse, context: string): void => {
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`${context} failed (${res.status}): ${res.body}`);
  }
};
