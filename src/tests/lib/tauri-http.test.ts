import { beforeEach, describe, expect, it, vi } from 'vitest';

// tauri-http imports invoke + tauriFetch at top level. stub to no-ops so the
// module evaluates without needing a Tauri runtime (logger mocks come from src/tests/setup.ts)
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: vi.fn() }));

import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { parseMultiStatus, tauriRequest } from '$lib/http';

const xml = (body: string) => `<?xml version="1.0" encoding="utf-8"?>${body}`;

const response = (status: number, headers: Record<string, string> = {}) =>
  ({
    status,
    headers: new Headers(headers),
    text: async () => '',
  }) as Response;

const credentials = { username: 'alice', password: 'secret' };

describe('tauriRequest redirects', () => {
  beforeEach(() => {
    vi.mocked(tauriFetch).mockReset();
  });

  it('keeps authorization on same-origin redirects', async () => {
    vi.mocked(tauriFetch)
      .mockResolvedValueOnce(response(302, { Location: '/dav/' }))
      .mockResolvedValueOnce(response(200));

    await tauriRequest('https://calendar.example', 'GET', credentials);

    const redirectedHeaders = vi.mocked(tauriFetch).mock.calls[1][1]?.headers as Record<
      string,
      string
    >;
    expect(redirectedHeaders.Authorization).toMatch(/^Basic /);
  });

  it('strips authorization on cross-origin redirects', async () => {
    vi.mocked(tauriFetch)
      .mockResolvedValueOnce(response(302, { Location: 'https://other.example/dav/' }))
      .mockResolvedValueOnce(response(200));

    await tauriRequest('https://calendar.example', 'GET', credentials, undefined, {
      Authorization: 'Digest sensitive',
      Cookie: 'session=sensitive',
    });

    const redirectedHeaders = vi.mocked(tauriFetch).mock.calls[1][1]?.headers as Record<
      string,
      string
    >;
    expect(redirectedHeaders.Authorization).toBeUndefined();
    expect(redirectedHeaders.Cookie).toBeUndefined();
  });

  it('upgrades HTTPS-to-HTTP same-host redirects and keeps authorization', async () => {
    vi.mocked(tauriFetch)
      .mockResolvedValueOnce(response(301, { Location: 'http://calendar.example/dav/' }))
      .mockResolvedValueOnce(response(207));

    await tauriRequest('https://calendar.example/.well-known/caldav', 'PROPFIND', credentials);

    const redirectedUrl = vi.mocked(tauriFetch).mock.calls[1][0];
    expect(redirectedUrl).toBe('https://calendar.example/dav/');

    const redirectedHeaders = vi.mocked(tauriFetch).mock.calls[1][1]?.headers as Record<
      string,
      string
    >;
    expect(redirectedHeaders.Authorization).toMatch(/^Basic /);
  });

  it('rejects redirects to non-HTTP URLs', async () => {
    vi.mocked(tauriFetch).mockResolvedValueOnce(response(302, { Location: 'file:///etc/passwd' }));

    await expect(tauriRequest('https://calendar.example', 'GET', credentials)).rejects.toThrow(
      /unsupported file: URL/i,
    );
  });

  it('stops after five redirects', async () => {
    vi.mocked(tauriFetch).mockResolvedValue(response(302, { Location: '/again' }));

    await expect(tauriRequest('https://calendar.example', 'GET', credentials)).rejects.toThrow(
      /Too many HTTP redirects/i,
    );
    expect(tauriFetch).toHaveBeenCalledTimes(6);
  });
});

describe('parseMultiStatus', () => {
  it('returns empty array for empty multistatus', () => {
    const result = parseMultiStatus(xml('<d:multistatus xmlns:d="DAV:"></d:multistatus>'));
    expect(result).toEqual([]);
  });

  it('throws for malformed XML', () => {
    expect(() => parseMultiStatus('<not xml lol')).toThrow(/Invalid CalDAV XML response/i);
  });

  it('throws when the XML is not a multistatus response', () => {
    expect(() => parseMultiStatus(xml('<d:error xmlns:d="DAV:"/>'))).toThrow(
      /Invalid CalDAV multistatus response/i,
    );
  });

  it('parses a single response with href, status, and props', () => {
    const result = parseMultiStatus(
      xml(`
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/cal/task.ics</d:href>
            <d:propstat>
              <d:prop>
                <d:getetag>"abc"</d:getetag>
              </d:prop>
              <d:status>HTTP/1.1 200 OK</d:status>
            </d:propstat>
          </d:response>
        </d:multistatus>
      `),
    );
    expect(result).toHaveLength(1);
    expect(result[0].href).toBe('/cal/task.ics');
    expect(result[0].props.getetag).toBe('"abc"');
  });

  it('parses multiple responses', () => {
    const result = parseMultiStatus(
      xml(`
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/a.ics</d:href>
            <d:propstat><d:prop><d:getetag>"a"</d:getetag></d:prop></d:propstat>
          </d:response>
          <d:response>
            <d:href>/b.ics</d:href>
            <d:propstat><d:prop><d:getetag>"b"</d:getetag></d:prop></d:propstat>
          </d:response>
        </d:multistatus>
      `),
    );
    expect(result).toHaveLength(2);
    expect(result[0].href).toBe('/a.ics');
    expect(result[1].href).toBe('/b.ics');
  });

  it('extracts joined child element names for resourcetype', () => {
    const result = parseMultiStatus(
      xml(`
        <d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
          <d:response>
            <d:href>/cal/</d:href>
            <d:propstat>
              <d:prop>
                <d:resourcetype>
                  <d:collection/>
                  <c:calendar/>
                </d:resourcetype>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>
      `),
    );
    expect(result[0].props.resourcetype).toBe('collection,calendar');
  });

  it('extracts href from current-user-principal', () => {
    const result = parseMultiStatus(
      xml(`
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/</d:href>
            <d:propstat>
              <d:prop>
                <d:current-user-principal>
                  <d:href>/principals/users/alice/</d:href>
                </d:current-user-principal>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>
      `),
    );
    expect(result[0].props['current-user-principal']).toBe('/principals/users/alice/');
  });

  it('extracts href from calendar-home-set', () => {
    const result = parseMultiStatus(
      xml(`
        <d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
          <d:response>
            <d:href>/principals/alice/</d:href>
            <d:propstat>
              <d:prop>
                <c:calendar-home-set>
                  <d:href>/calendars/alice/</d:href>
                </c:calendar-home-set>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>
      `),
    );
    expect(result[0].props['calendar-home-set']).toBe('/calendars/alice/');
  });

  it('returns null for current-user-principal without an inner href', () => {
    const result = parseMultiStatus(
      xml(`
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/</d:href>
            <d:propstat>
              <d:prop>
                <d:current-user-principal/>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>
      `),
    );
    expect(result[0].props['current-user-principal']).toBeNull();
  });

  it('handles a response with no propstat (empty props)', () => {
    const result = parseMultiStatus(
      xml(`
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/missing</d:href>
            <d:status>HTTP/1.1 404 Not Found</d:status>
          </d:response>
        </d:multistatus>
      `),
    );
    expect(result[0].props).toEqual({});
  });

  it('returns empty href when not present', () => {
    const result = parseMultiStatus(
      xml(`
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:propstat><d:prop><d:getetag>"x"</d:getetag></d:prop></d:propstat>
          </d:response>
        </d:multistatus>
      `),
    );
    expect(result[0].href).toBe('');
  });

  it('returns innerHTML for elements with non-href child elements', () => {
    const result = parseMultiStatus(
      xml(`
        <d:multistatus xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav">
          <d:response>
            <d:href>/cal/</d:href>
            <d:propstat>
              <d:prop>
                <cal:supported-calendar-component-set>
                  <cal:comp name="VEVENT"/>
                  <cal:comp name="VTODO"/>
                </cal:supported-calendar-component-set>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>
      `),
    );
    expect(result[0].props['supported-calendar-component-set']).toContain('VEVENT');
    expect(result[0].props['supported-calendar-component-set']).toContain('VTODO');
  });

  it('handles unicode content', () => {
    const result = parseMultiStatus(
      xml(`
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/cal/✓.ics</d:href>
            <d:propstat>
              <d:prop>
                <d:displayname>Café 🎉</d:displayname>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>
      `),
    );
    expect(result[0].href).toBe('/cal/✓.ics');
    expect(result[0].props.displayname).toBe('Café 🎉');
  });
});
