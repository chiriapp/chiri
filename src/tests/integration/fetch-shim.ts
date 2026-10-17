/**
 * fetch shim of $lib/http for integration tests
 *
 * the production module routes through Tauri IPC (`invoke('http_request', ...)`
 * or `tauriFetch`). neither is available in plain Node. this shim re-implements
 * the same exports (put, propfind, report, proppatch, mkcalendar, del,
 * tauriRequest) using Node's built-in fetch
 *
 * keep the API surface identical to src/lib/tauri-http.ts. the production
 * CalDAV functions import these by name and won't know they're talking to a
 * different transport
 */

import type { CalDAVCredentials, HttpResponse } from '$lib/http';

const MAX_REDIRECTS = 5;
const REDIRECT_STATUS_CODES = new Set([301, 302, 307, 308]);

const authHeader = (credentials: CalDAVCredentials) =>
  credentials.bearerToken
    ? `Bearer ${credentials.bearerToken}`
    : `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`;

const getRedirectUrl = (response: HttpResponse, url: string): string | undefined => {
  if (!REDIRECT_STATUS_CODES.has(response.status)) return undefined;
  const location = response.headers.location;
  if (!location) return undefined;

  const originalUrl = new URL(url);
  const redirectUrl = new URL(location, url);
  if (!['http:', 'https:'].includes(redirectUrl.protocol)) {
    throw new Error(`Refusing redirect to unsupported ${redirectUrl.protocol} URL`);
  }
  if (
    originalUrl.protocol === 'https:' &&
    redirectUrl.protocol === 'http:' &&
    redirectUrl.hostname === originalUrl.hostname
  ) {
    redirectUrl.protocol = 'https:';
  }
  return redirectUrl.toString();
};

const hasSameOrigin = (left: string, right: string) =>
  new URL(left).origin === new URL(right).origin;

export const tauriRequest = async (
  url: string,
  method: string,
  credentials: CalDAVCredentials,
  body?: string,
  headers?: Record<string, string>,
  _retried = false,
  _redirects = 0,
  _allowAuth = true,
): Promise<HttpResponse> => {
  const response = await fetch(url, {
    method,
    headers: {
      'User-Agent': 'Chiri-integration-tests',
      'Content-Type': 'application/xml; charset=utf-8',
      ...headers,
      ...(_allowAuth ? { Authorization: authHeader(credentials) } : {}),
    },
    body,
    redirect: 'manual',
  });
  const responseBody = await response.text();
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((v, k) => {
    responseHeaders[k.toLowerCase()] = v;
  });
  const result = { status: response.status, headers: responseHeaders, body: responseBody };

  const redirectUrl = getRedirectUrl(result, url);
  if (redirectUrl) {
    if (_redirects >= MAX_REDIRECTS) {
      throw new Error(`Too many HTTP redirects (maximum ${MAX_REDIRECTS})`);
    }
    return tauriRequest(
      redirectUrl,
      method,
      credentials,
      body,
      headers,
      false,
      _redirects + 1,
      _allowAuth && hasSameOrigin(url, redirectUrl),
    );
  }

  return result;
};

export const propfind = async (
  url: string,
  credentials: CalDAVCredentials,
  body: string,
  depth: '0' | '1' | 'infinity' = '1',
) =>
  tauriRequest(url, 'PROPFIND', credentials, body, {
    Depth: depth,
    'Content-Type': 'application/xml; charset=utf-8',
  });

export const report = async (
  url: string,
  credentials: CalDAVCredentials,
  body: string,
  depth: '0' | '1' = '1',
) =>
  tauriRequest(url, 'REPORT', credentials, body, {
    Depth: depth,
    'Content-Type': 'application/xml; charset=utf-8',
  });

export const proppatch = async (url: string, credentials: CalDAVCredentials, body: string) =>
  tauriRequest(url, 'PROPPATCH', credentials, body, {
    'Content-Type': 'application/xml; charset=utf-8',
  });

export const put = async (
  url: string,
  credentials: CalDAVCredentials,
  body: string,
  etag?: string,
) => {
  const headers: Record<string, string> = {
    'Content-Type': 'text/calendar; charset=utf-8',
  };
  if (etag) headers['If-Match'] = `"${etag}"`;
  else headers['If-None-Match'] = '*';
  return tauriRequest(url, 'PUT', credentials, body, headers);
};

export const del = async (url: string, credentials: CalDAVCredentials, etag?: string) => {
  const headers: Record<string, string> = {};
  if (etag) headers['If-Match'] = `"${etag}"`;
  return tauriRequest(url, 'DELETE', credentials, undefined, headers);
};

export const mkcalendar = async (url: string, credentials: CalDAVCredentials, body: string) =>
  tauriRequest(url, 'MKCALENDAR', credentials, body);

// re-export error helpers used by production callers
export const isCertError = () => false;
export const getErrorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
