import { invoke } from '@tauri-apps/api/core';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { buildDigestAuth, parseDigestChallenge } from '$lib/auth/digest';
import { loggers } from '$lib/logger';

const log = loggers.http;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;
const REDIRECT_STATUS_CODES = new Set([301, 302, 307, 308]);
const HREF_PROP_NAMES = new Set(['current-user-principal', 'calendar-home-set']);
const SENSITIVE_HEADERS = new Set(['authorization', 'cookie', 'proxy-authorization']);

// tracks which server hosts require Digest auth so we can skip the wasted
// basic-auth attempt on the first round-trip. Cleared on app restart (intentionally)
const digestHosts = new Set<string>();

const getHostname = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface CalDAVCredentials {
  username: string;
  password: string;

  /** OAuth Bearer token - if provided, uses Bearer auth instead of Basic */
  bearerToken?: string;

  /** if true, TLS certificate validation is skipped (self-signed / private CA) */
  acceptInvalidCerts?: boolean;
}

const shouldSkipBasicAuth = (url: string, credentials: CalDAVCredentials) => {
  return !credentials.bearerToken && digestHosts.has(getHostname(url));
};

const getAuthHeader = (credentials: CalDAVCredentials, skipBasic: boolean) => {
  if (credentials.bearerToken) {
    return `Bearer ${credentials.bearerToken}`;
  }

  if (skipBasic) {
    return undefined;
  }

  return `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;
};

const getRequestHeaders = (
  credentials: CalDAVCredentials,
  headers: Record<string, string> | undefined,
  skipBasic: boolean,
  allowAuth: boolean,
) => {
  const authHeader = allowAuth ? getAuthHeader(credentials, skipBasic) : undefined;
  const safeHeaders = Object.fromEntries(
    Object.entries(headers ?? {}).filter(
      ([name]) => allowAuth || !SENSITIVE_HEADERS.has(name.toLowerCase()),
    ),
  );

  return {
    'User-Agent': 'Chiri',
    'Content-Type': 'application/xml; charset=utf-8',
    ...safeHeaders,
    ...(authHeader ? { Authorization: authHeader } : {}),
  };
};

const sendHttpRequest = async (
  url: string,
  method: string,
  credentials: CalDAVCredentials,
  requestHeaders: Record<string, string>,
  body?: string,
) => {
  if (credentials.acceptInvalidCerts || credentials.bearerToken) {
    return invoke<HttpResponse>('http_request', {
      url,
      method,
      headers: requestHeaders,
      body: body ?? null,
      acceptInvalidCerts: credentials.acceptInvalidCerts ?? false,
    });
  }

  const rawResponse = await tauriFetch(url, {
    method: method,
    headers: requestHeaders,
    body: body,
    maxRedirections: 0,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const responseBody = await rawResponse.text();
  const headersObj: Record<string, string> = {};
  rawResponse.headers.forEach((value, key) => {
    headersObj[key] = value;
  });

  return { status: rawResponse.status, headers: headersObj, body: responseBody };
};

const getRedirectUrl = (response: HttpResponse, url: string) => {
  if (!REDIRECT_STATUS_CODES.has(response.status)) {
    return undefined;
  }

  const location = response.headers.location ?? response.headers.Location;
  if (!location) return undefined;

  const redirectUrl = new URL(location, url);
  if (!['http:', 'https:'].includes(redirectUrl.protocol)) {
    throw new Error(`Refusing redirect to unsupported ${redirectUrl.protocol} URL`);
  }
  return redirectUrl.toString();
};

const hasSameOrigin = (left: string, right: string) => {
  return new URL(left).origin === new URL(right).origin;
};

const getDigestRetryHeader = (
  response: HttpResponse,
  method: string,
  url: string,
  credentials: CalDAVCredentials,
) => {
  if (response.status !== 401) {
    return undefined;
  }

  const wwwAuth =
    response.headers['www-authenticate'] ?? response.headers['WWW-Authenticate'] ?? '';
  if (!wwwAuth.toLowerCase().includes('digest ')) {
    return undefined;
  }

  const challenge = parseDigestChallenge(wwwAuth);
  if (!challenge) {
    return undefined;
  }

  return {
    header: buildDigestAuth(method, url, credentials.username, credentials.password, challenge),
    realm: challenge.realm,
  };
};

/**
 * returns true if the error looks like a TLS certificate validation failure
 * covers native-tls (macOS/Windows) and rustls (Linux) error messages
 */
export const isCertError = (error: unknown) => {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const lower = raw.toLowerCase();
  return (
    lower.includes('certificate') ||
    lower.includes('unknownissuer') ||
    lower.includes('invalidcertificate') ||
    lower.includes('self signed') ||
    lower.includes('self-signed') ||
    lower.includes('cert')
  );
};

/**
 * extracts a human-readable message from an unknown caught value
 * the Tauri HTTP plugin throws plain strings for network errors, not Error objects
 */
export const getErrorMessage = (error: unknown) => {
  const raw =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';

  if (isCertError(raw)) {
    return 'Server certificate could not be verified (self-signed or untrusted CA)';
  }

  if (raw.includes('error sending request for url')) {
    return 'Server unreachable';
  }

  return raw;
};

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
  // for known Digest-only hosts, skip sending wrong Basic auth upfront
  // we'll still do 2 round-trips (need server's nonce), but won't waste one
  // on a credential that's guaranteed to be rejected
  const skipBasic = _allowAuth && shouldSkipBasicAuth(url, credentials);

  // suppress logs for the nonce-fetch leg of a known Digest handshake. Logs fire on the authenticated retry
  const silent = skipBasic && !_retried;

  if (!silent) log.debug(`${method} ${url}`);

  const requestHeaders = getRequestHeaders(credentials, headers, skipBasic, _allowAuth);

  // route through the Rust command when:
  //  - cert validation bypass is needed (self-signed / private CA), or
  //  - bearer token auth is in use (WebView injects an Origin header that
  //    some servers, including Fastmail, reject)
  const response = await sendHttpRequest(url, method, credentials, requestHeaders, body);

  if (!silent) log.debug(`Response: ${response.status}`);

  // handle redirects manually for CalDAV
  const redirectUrl = getRedirectUrl(response, url);
  if (redirectUrl) {
    if (_redirects >= MAX_REDIRECTS) {
      throw new Error(`Too many HTTP redirects (maximum ${MAX_REDIRECTS})`);
    }
    if (!silent) log.debug(`Following redirect to: ${redirectUrl}`);
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

  // retry once with Digest auth if the server requires it
  const digestRetry =
    _retried || !_allowAuth ? undefined : getDigestRetryHeader(response, method, url, credentials);
  if (digestRetry) {
    if (!silent) log.debug(`Retrying with Digest auth (realm: ${digestRetry.realm})`);
    digestHosts.add(getHostname(url));
    return tauriRequest(
      url,
      method,
      credentials,
      body,
      { ...headers, Authorization: digestRetry.header },
      true,
      _redirects,
      _allowAuth,
    );
  }

  return response;
};

/**
 * PROPFIND request for CalDAV discovery and listing
 */
export const propfind = async (
  url: string,
  credentials: CalDAVCredentials,
  body: string,
  depth: '0' | '1' | 'infinity' = '1',
) => {
  return tauriRequest(url, 'PROPFIND', credentials, body, {
    Depth: depth,
    'Content-Type': 'application/xml; charset=utf-8',
  });
};

/**
 * REPORT request for CalDAV queries (fetching tasks with filters)
 */
export const report = async (
  url: string,
  credentials: CalDAVCredentials,
  body: string,
  depth: '0' | '1' = '1',
) => {
  return tauriRequest(url, 'REPORT', credentials, body, {
    Depth: depth,
    'Content-Type': 'application/xml; charset=utf-8',
  });
};

/**
 * PROPPATCH request for updating properties
 */
export const proppatch = async (url: string, credentials: CalDAVCredentials, body: string) => {
  return tauriRequest(url, 'PROPPATCH', credentials, body, {
    'Content-Type': 'application/xml; charset=utf-8',
  });
};

/**
 * PUT request for creating/updating calendar objects
 */
export const put = async (
  url: string,
  credentials: CalDAVCredentials,
  body: string,
  etag?: string,
) => {
  const headers: Record<string, string> = {
    'Content-Type': 'text/calendar; charset=utf-8',
  };

  if (etag) {
    // ETags must be quoted in If-Match header per RFC 2616
    headers['If-Match'] = `"${etag}"`;
  } else {
    headers['If-None-Match'] = '*';
  }

  return tauriRequest(url, 'PUT', credentials, body, headers);
};

/**
 * DELETE request for removing calendar objects
 */
export const del = async (url: string, credentials: CalDAVCredentials, etag?: string) => {
  const headers: Record<string, string> = {};

  if (etag) {
    // ETags must be quoted in If-Match header per RFC 2616
    headers['If-Match'] = `"${etag}"`;
  }

  return tauriRequest(url, 'DELETE', credentials, undefined, headers);
};

/**
 * MKCALENDAR request for creating a new calendar collection
 */
export const mkcalendar = async (url: string, credentials: CalDAVCredentials, body: string) => {
  return tauriRequest(url, 'MKCALENDAR', credentials, body);
};

const parsePropValue = (child: Element) => {
  const localName = child.localName;

  if (localName === 'resourcetype') {
    return Array.from(child.children)
      .map((c) => c.localName)
      .join(',');
  }

  if (HREF_PROP_NAMES.has(localName)) {
    return child.querySelector('href')?.textContent ?? null;
  }

  return child.children.length > 0 ? child.innerHTML : child.textContent;
};

const parseProps = (propstat: Element | null) => {
  const props: Record<string, string | null> = {};
  const prop = propstat?.querySelector('prop');

  if (!prop) {
    return props;
  }

  for (const child of prop.children) {
    props[child.localName] = parsePropValue(child);
  }

  return props;
};

/**
 * parse multistatus XML response
 */
export const parseMultiStatus = (xml: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid CalDAV XML response.');
  }

  if (doc.documentElement?.localName !== 'multistatus') {
    throw new Error('Invalid CalDAV multistatus response.');
  }

  const responses: MultiStatusResponse[] = [];
  const responseElements = doc.querySelectorAll('response');

  for (const resp of responseElements) {
    responses.push({
      href: resp.querySelector('href')?.textContent ?? '',
      status: resp.querySelector('status')?.textContent ?? '',
      props: parseProps(resp.querySelector('propstat')),
    });
  }

  return responses;
};

export interface MultiStatusResponse {
  href: string;
  status: string;
  props: Record<string, string | null>;
}
