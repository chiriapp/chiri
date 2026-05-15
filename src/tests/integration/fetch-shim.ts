/**
 * node-fetch shim of $lib/tauri-http for integration tests.
 *
 * the production module routes through Tauri IPC (`invoke('caldav_request', ...)`
 * or `tauriFetch`). neither is available in plain Node. this shim re-implements
 * the same exports (put, propfind, report, proppatch, mkcalendar, del,
 * tauriRequest, parseMultiStatus) using Node's built-in fetch
 *
 * keep the API surface identical to src/lib/tauri-http.ts. the production
 * CalDAV functions import these by name and won't know they're talking to a
 * different transport
 */

import { DOMParser, type Element, type Node } from '@xmldom/xmldom';

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface CalDAVCredentials {
  username: string;
  password: string;
  bearerToken?: string;
  acceptInvalidCerts?: boolean;
}

export interface MultiStatusResponse {
  href: string;
  status: string;
  props: Record<string, string | null>;
}

const authHeader = (credentials: CalDAVCredentials): string =>
  credentials.bearerToken
    ? `Bearer ${credentials.bearerToken}`
    : `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`;

export const tauriRequest = async (
  url: string,
  method: string,
  credentials: CalDAVCredentials,
  body?: string,
  headers?: Record<string, string>,
): Promise<HttpResponse> => {
  const response = await fetch(url, {
    method,
    headers: {
      'User-Agent': 'Chiri-integration-tests',
      'Content-Type': 'application/xml; charset=utf-8',
      ...headers,
      Authorization: authHeader(credentials),
    },
    body,
    redirect: 'manual',
  });
  const responseBody = await response.text();
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((v, k) => {
    responseHeaders[k.toLowerCase()] = v;
  });
  return { status: response.status, headers: responseHeaders, body: responseBody };
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

const elementChildren = (node: Node): Element[] => {
  const out: Element[] = [];
  for (let i = 0; i < node.childNodes.length; i++) {
    const c = node.childNodes.item(i) as Element | null;
    if (c && c.nodeType === 1) out.push(c);
  }
  return out;
};

const parsePropValue = (child: Element): string | null => {
  const localName = child.localName ?? '';
  if (localName === 'resourcetype') {
    return elementChildren(child)
      .map((c) => c.localName ?? '')
      .filter(Boolean)
      .join(',');
  }
  if (localName === 'current-user-principal' || localName === 'calendar-home-set') {
    return child.getElementsByTagNameNS('DAV:', 'href').item(0)?.textContent ?? null;
  }
  if (child.childNodes.length > 0 && hasElementChild(child)) {
    return innerXml(child);
  }
  return child.textContent;
};

const parseProps = (propstat: Element): Record<string, string | null> => {
  const prop = propstat.getElementsByTagNameNS('DAV:', 'prop').item(0);
  if (!prop) return {};
  const props: Record<string, string | null> = {};
  for (const child of elementChildren(prop)) {
    const localName = child.localName ?? '';
    if (localName) props[localName] = parsePropValue(child);
  }
  return props;
};

// parseMultiStatus identical in shape to the production version, but uses the
// xmldom DOMParser polyfill so it works under plain Node (no jsdom required
// per-test in the integration project)
export const parseMultiStatus = (xml: string): MultiStatusResponse[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const responses: MultiStatusResponse[] = [];
  const responseElements = doc.getElementsByTagNameNS('DAV:', 'response');

  for (let i = 0; i < responseElements.length; i++) {
    const resp = responseElements.item(i);
    if (!resp) continue;
    const href = resp.getElementsByTagNameNS('DAV:', 'href').item(0)?.textContent ?? '';
    const status = resp.getElementsByTagNameNS('DAV:', 'status').item(0)?.textContent ?? '';
    const propstat = resp.getElementsByTagNameNS('DAV:', 'propstat').item(0);
    const props = propstat ? parseProps(propstat) : {};
    responses.push({ href, status, props });
  }
  return responses;
};

const hasElementChild = (node: Node) => {
  for (let i = 0; i < node.childNodes.length; i++) {
    const c = node.childNodes.item(i);
    if (c && c.nodeType === 1) return true;
  }
  return false;
};

const innerXml = (el: Element): string => {
  let out = '';
  for (let i = 0; i < el.childNodes.length; i++) {
    const c = el.childNodes.item(i);
    if (!c) continue;
    if (c.nodeType === 1) {
      const child = c as Element;
      const attrs = Array.from({ length: child.attributes?.length ?? 0 })
        .map((_, idx) => {
          const a = child.attributes!.item(idx);
          return a ? ` ${a.name}="${a.value}"` : '';
        })
        .join('');
      out += `<${child.tagName}${attrs}>${innerXml(child)}</${child.tagName}>`;
    } else if (c.nodeType === 3) {
      out += c.textContent ?? '';
    }
  }
  return out;
};

// re-export error helpers used by production callers
export const isCertError = () => false;
export const getErrorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
