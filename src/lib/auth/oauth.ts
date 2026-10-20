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

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

interface ParseTokenResponseOptions {
  fallbackRefreshToken?: string;
  requireRotatedRefreshTokenFrom?: string;
}

export class OAuthTokenEndpointError extends Error {
  readonly error: string;
  readonly errorDescription?: string;
  readonly temporary?: boolean;
  readonly status: number;

  constructor({
    context,
    error,
    errorDescription,
    temporary,
    status,
  }: {
    context: string;
    error: string;
    errorDescription?: string;
    temporary?: boolean;
    status: number;
  }) {
    super(`${context} failed (${status}): ${errorDescription ?? error}`);
    this.name = 'OAuthTokenEndpointError';
    this.error = error;
    this.errorDescription = errorDescription;
    this.temporary = temporary;
    this.status = status;
  }
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readTokenResponse = (data: unknown): OAuthTokenResponse => {
  if (!isRecord(data)) {
    throw new Error('Token response must be a JSON object.');
  }

  const accessToken = data.access_token;
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new Error('Token response is missing a valid access_token.');
  }

  const refreshToken = data.refresh_token;
  if (
    refreshToken !== undefined &&
    (typeof refreshToken !== 'string' || refreshToken.length === 0)
  ) {
    throw new Error('Token response contains an invalid refresh_token.');
  }

  const expiresIn = data.expires_in;
  if (
    expiresIn !== undefined &&
    (typeof expiresIn !== 'number' || !Number.isFinite(expiresIn) || expiresIn < 0)
  ) {
    throw new Error('Token response contains an invalid expires_in value.');
  }

  return {
    access_token: accessToken,
    ...(refreshToken === undefined ? {} : { refresh_token: refreshToken }),
    ...(expiresIn === undefined ? {} : { expires_in: expiresIn }),
  };
};

export const parseTokenResponse = (
  data: unknown,
  { fallbackRefreshToken, requireRotatedRefreshTokenFrom }: ParseTokenResponseOptions = {},
): OAuthTokens => {
  const response = readTokenResponse(data);
  const refreshToken = response.refresh_token ?? fallbackRefreshToken;

  if (!refreshToken) {
    throw new Error('Token response is missing a valid refresh_token.');
  }

  if (
    requireRotatedRefreshTokenFrom !== undefined &&
    refreshToken === requireRotatedRefreshTokenFrom
  ) {
    throw new Error('Token response did not rotate the refresh_token.');
  }

  const expiresIn = response.expires_in ?? 3600;
  const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();
  return { accessToken: response.access_token, refreshToken, tokenExpiry };
};

const HTML_TAG_RE = /<[^>]+>/g;
const WHITESPACE_RE = /\s+/g;

const stripHtmlTags = (value: string): string =>
  value.replace(HTML_TAG_RE, ' ').replace(WHITESPACE_RE, ' ').trim();

export const assertTokenResponseOk = (res: HttpResponse, context: string): void => {
  if (res.status < 200 || res.status >= 300) {
    try {
      const data = JSON.parse(res.body) as unknown;
      if (isRecord(data) && typeof data.error === 'string' && data.error.length > 0) {
        const errorDescription =
          typeof data.error_description === 'string' && data.error_description.length > 0
            ? data.error_description
            : undefined;
        const temporary = typeof data.temporary === 'boolean' ? data.temporary : undefined;
        throw new OAuthTokenEndpointError({
          context,
          error: data.error,
          errorDescription,
          temporary,
          status: res.status,
        });
      }
    } catch (error) {
      if (error instanceof OAuthTokenEndpointError) throw error;
    }

    const body = stripHtmlTags(res.body).slice(0, 200);
    throw new Error(`${context} failed (${res.status})${body ? `: ${body}` : '.'}`);
  }
};
