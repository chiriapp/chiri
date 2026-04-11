import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { buildDigestAuth, parseDigestChallenge } from '$lib/digest-auth';
import { loggers } from '$lib/logger';

const log = loggers.http;

// Tracks which server hosts require Digest auth so we can skip the wasted
// Basic-auth attempt on the first round-trip. Cleared on app restart (intentionally).
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
}

export const tauriRequest = async (
  url: string,
  method: string,
  credentials: CalDAVCredentials,
  body?: string,
  headers?: Record<string, string>,
  _retried = false,
): Promise<HttpResponse> => {
  // For known Digest-only hosts, skip sending wrong Basic auth upfront.
  // We'll still do 2 round-trips (need server's nonce), but won't waste one
  // on a credential that's guaranteed to be rejected.
  const skipBasic = !credentials.bearerToken && digestHosts.has(getHostname(url));

  // Suppress logs for the nonce-fetch leg of a known Digest handshake. Logs fire on the authenticated retry.
  const silent = skipBasic && !_retried;

  if (!silent) log.debug(`${method} ${url}`);

  const authHeader = credentials.bearerToken
    ? `Bearer ${credentials.bearerToken}`
    : skipBasic
      ? undefined
      : `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;

  const requestHeaders: Record<string, string> = {
    'User-Agent': 'Chiri',
    'Content-Type': 'application/xml; charset=utf-8',
    ...headers,
    ...(authHeader ? { Authorization: authHeader } : {}),
  };

  const response = await tauriFetch(url, {
    method: method,
    headers: requestHeaders,
    body: body,
    maxRedirections: 0,
  });

  if (!silent) log.debug(`Response: ${response.status}`);

  // handle redirects manually for CalDAV
  if ([301, 302, 307, 308].includes(response.status)) {
    const location = response.headers.get('location') ?? response.headers.get('Location');
    if (location) {
      if (!silent) log.debug(`Following redirect to: ${location}`);
      // resolve relative URLs
      const redirectUrl = new URL(location, url).toString();
      return tauriRequest(redirectUrl, method, credentials, body, headers);
    }
  }

  // Retry once with Digest auth if the server requires it
  if (response.status === 401 && !_retried) {
    const wwwAuth =
      response.headers.get('www-authenticate') ?? response.headers.get('WWW-Authenticate') ?? '';
    if (wwwAuth.toLowerCase().includes('digest ')) {
      const challenge = parseDigestChallenge(wwwAuth);
      if (challenge) {
        const digestHeader = buildDigestAuth(
          method,
          url,
          credentials.username,
          credentials.password,
          challenge,
        );
        if (!silent) log.debug(`Retrying with Digest auth (realm: ${challenge.realm})`);
        digestHosts.add(getHostname(url));
        return tauriRequest(
          url,
          method,
          credentials,
          body,
          { ...headers, Authorization: digestHeader },
          true,
        );
      }
    }
  }

  // convert response text
  const responseBody = await response.text();

  // convert Headers to plain object
  const headersObj: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headersObj[key] = value;
  });

  return {
    status: response.status,
    headers: headersObj,
    body: responseBody,
  };
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

/**
 * parse multistatus XML response
 */
export const parseMultiStatus = (xml: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  const responses: MultiStatusResponse[] = [];
  const responseElements = doc.querySelectorAll('response');

  for (const resp of responseElements) {
    const href = resp.querySelector('href')?.textContent ?? '';
    const status = resp.querySelector('status')?.textContent ?? '';
    const propstat = resp.querySelector('propstat');

    const props: Record<string, string | null> = {};

    if (propstat) {
      const prop = propstat.querySelector('prop');
      if (prop) {
        for (const child of prop.children) {
          // handle namespaced element names
          const localName = child.localName;

          // special handling for resourcetype - check for child elements
          if (localName === 'resourcetype') {
            // get all child element names (like "calendar", "collection", "principal")
            const childNames = Array.from(child.children).map((c) => c.localName);
            props[localName] = childNames.join(',');
          } else if (localName === 'current-user-principal' || localName === 'calendar-home-set') {
            // these properties contain an <href> child element
            const hrefElement = child.querySelector('href');
            props[localName] = hrefElement?.textContent ?? null;
          } else if (child.children.length > 0) {
            // for other elements with children, get innerHTML to preserve structure
            props[localName] = child.innerHTML;
          } else {
            props[localName] = child.textContent;
          }
        }
      }
    }

    responses.push({ href, status, props });
  }

  return responses;
};

export interface MultiStatusResponse {
  href: string;
  status: string;
  props: Record<string, string | null>;
}
