import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpResponse } from '$lib/tauri-http';

vi.mock('$lib/tauri-http', () => ({
  propfind: vi.fn(),
  parseMultiStatus: vi.fn(() => []),
  tauriRequest: vi.fn(),
}));

// mock the connection store. vi.hoisted runs before vi.mock factories so the
// spy reference is initialized in time
const { setConnection } = vi.hoisted(() => ({ setConnection: vi.fn() }));
vi.mock('$context/connectionContext', () => ({
  connectionStore: {
    setConnection,
    getConnection: vi.fn(),
    deleteConnection: vi.fn(),
    hasConnection: vi.fn(),
  },
}));

vi.mock('$lib/caldav/utils', () => ({
  makeAbsoluteUrl: (href: string, base: string) =>
    href.startsWith('http') ? href : new URL(href, base).toString(),
}));

import { connect, detectVikunja, handleCommonHttpErrors } from '$lib/caldav/connection';
import * as http from '$lib/tauri-http';

const httpOk = (status: number, body = ''): HttpResponse => ({ status, headers: {}, body });

describe('handleCommonHttpErrors', () => {
  it('throws rate-limit message on 429', () => {
    expect(() => handleCommonHttpErrors({ status: 429 })).toThrow(/rate limit/i);
  });

  it('throws auth-failed message on 401', () => {
    expect(() => handleCommonHttpErrors({ status: 401 })).toThrow(/authentication/i);
  });

  it('throws forbidden message on 403', () => {
    expect(() => handleCommonHttpErrors({ status: 403 })).toThrow(/forbidden/i);
  });

  it('throws not-found with context on 404', () => {
    expect(() => handleCommonHttpErrors({ status: 404 }, 'principal')).toThrow(
      /principal not found/i,
    );
  });

  it('uses default "CalDAV" context for 404 when none provided', () => {
    expect(() => handleCommonHttpErrors({ status: 404 })).toThrow(/CalDAV not found/i);
  });

  it('throws server-error message on 500', () => {
    expect(() => handleCommonHttpErrors({ status: 500 })).toThrow(/server error \(500\)/i);
  });

  it('throws server-error message on 503', () => {
    expect(() => handleCommonHttpErrors({ status: 503 })).toThrow(/server error \(503\)/i);
  });

  it('does NOT throw on success codes', () => {
    expect(() => handleCommonHttpErrors({ status: 200 })).not.toThrow();
    expect(() => handleCommonHttpErrors({ status: 207 })).not.toThrow();
    expect(() => handleCommonHttpErrors({ status: 204 })).not.toThrow();
  });

  it('does NOT throw on 400 (caller decides)', () => {
    // 400 isn't handled here - the function only maps the "common" ones.
    expect(() => handleCommonHttpErrors({ status: 400 })).not.toThrow();
  });
});

describe('detectVikunja', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true when /api/v1/info returns caldav_enabled: true', async () => {
    vi.mocked(http.tauriRequest).mockResolvedValueOnce(
      httpOk(200, JSON.stringify({ caldav_enabled: true })),
    );

    expect(
      await detectVikunja('https://vikunja.example.com', { username: 'u', password: 'p' }),
    ).toBe(true);
  });

  it('throws specific error when Vikunja is detected but caldav_enabled is false', async () => {
    vi.mocked(http.tauriRequest).mockResolvedValueOnce(
      httpOk(200, JSON.stringify({ caldav_enabled: false })),
    );

    await expect(
      detectVikunja('https://vikunja.example.com', { username: 'u', password: 'p' }),
    ).rejects.toThrow(/Vikunja CalDAV integration is disabled/i);
  });

  it('returns false when /api/v1/info returns non-200', async () => {
    vi.mocked(http.tauriRequest).mockResolvedValueOnce(httpOk(404));

    expect(await detectVikunja('https://other.example.com', { username: 'u', password: 'p' })).toBe(
      false,
    );
  });

  it('returns false when response body is not JSON', async () => {
    vi.mocked(http.tauriRequest).mockResolvedValueOnce(httpOk(200, '<html>not json</html>'));

    expect(await detectVikunja('https://other.example.com', { username: 'u', password: 'p' })).toBe(
      false,
    );
  });

  it('returns false when response JSON lacks caldav_enabled field', async () => {
    vi.mocked(http.tauriRequest).mockResolvedValueOnce(
      httpOk(200, JSON.stringify({ name: 'something else' })),
    );

    expect(await detectVikunja('https://x.example.com', { username: 'u', password: 'p' })).toBe(
      false,
    );
  });

  it('returns false when tauriRequest throws (network error)', async () => {
    vi.mocked(http.tauriRequest).mockRejectedValueOnce(new Error('connection refused'));

    expect(await detectVikunja('https://x.example.com', { username: 'u', password: 'p' })).toBe(
      false,
    );
  });

  it('strips trailing slash from serverUrl before building /api/v1/info', async () => {
    vi.mocked(http.tauriRequest).mockResolvedValueOnce(
      httpOk(200, JSON.stringify({ caldav_enabled: true })),
    );

    await detectVikunja('https://vikunja.example.com/', { username: 'u', password: 'p' });

    expect(http.tauriRequest).toHaveBeenCalledWith(
      'https://vikunja.example.com/api/v1/info',
      'GET',
      { username: 'u', password: 'p' },
    );
  });
});

describe('connect — explicit server type URL construction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // connect() does a final PROPFIND to verify principal - make it succeed
    vi.mocked(http.propfind).mockResolvedValue(httpOk(207, ''));
    vi.mocked(http.parseMultiStatus).mockReturnValue([
      { href: '', status: '', props: { displayname: 'Test User' } },
    ]);
  });

  it('builds Baikal principal + calendar home URLs from username', async () => {
    const result = await connect('a1', 'https://x.com', 'alice', 'pw', 'baikal');

    expect(result.principalUrl).toBe('https://x.com/dav.php/principals/alice/');
    expect(result.calendarHome).toBe('https://x.com/dav.php/calendars/alice/');
  });

  it('builds Nextcloud URLs', async () => {
    const result = await connect('a1', 'https://cloud.x.com', 'alice', 'pw', 'nextcloud');

    expect(result.principalUrl).toBe('https://cloud.x.com/remote.php/dav/principals/users/alice/');
    expect(result.calendarHome).toBe('https://cloud.x.com/remote.php/dav/calendars/alice/');
  });

  it('builds Radicale URL (principal == calendar home, flat structure)', async () => {
    const result = await connect('a1', 'https://radicale.x.com', 'alice', 'pw', 'radicale');

    expect(result.principalUrl).toBe('https://radicale.x.com/alice/');
    expect(result.calendarHome).toBe('https://radicale.x.com/alice/');
  });

  it('builds Rustical URL', async () => {
    const result = await connect('a1', 'https://rust.x.com', 'alice', 'pw', 'rustical');

    expect(result.principalUrl).toBe('https://rust.x.com/caldav/principal/alice/');
  });

  it('builds Fruux URLs (separate principal + calendar home paths)', async () => {
    const result = await connect('a1', 'https://dav.fruux.com', 'alice', 'pw', 'fruux');

    expect(result.principalUrl).toBe('https://dav.fruux.com/principals/uid/alice/');
    expect(result.calendarHome).toBe('https://dav.fruux.com/calendars/alice/');
  });

  it('builds Vikunja URLs (calendar home is /dav/projects/, ignores username)', async () => {
    const result = await connect('a1', 'https://vk.x.com', 'alice', 'pw', 'vikunja');

    expect(result.principalUrl).toBe('https://vk.x.com/dav/principals/alice/');
    expect(result.calendarHome).toBe('https://vk.x.com/dav/projects/');
  });

  it('strips trailing slash from serverUrl', async () => {
    const result = await connect('a1', 'https://x.com/', 'alice', 'pw', 'baikal');

    expect(result.principalUrl).toBe('https://x.com/dav.php/principals/alice/');
  });

  it('uses calendarHomeUrl override directly (skips discovery)', async () => {
    const result = await connect(
      'a1',
      'https://x.com',
      'alice',
      'pw',
      'generic',
      'https://x.com/custom/calendars/alice',
    );

    expect(result.calendarHome).toBe('https://x.com/custom/calendars/alice/');
    expect(result.principalUrl).toBe('https://x.com/custom/calendars/alice/');
  });

  it('stores the connection in connectionStore on success', async () => {
    await connect('a1', 'https://x.com', 'alice', 'pw', 'baikal');

    expect(setConnection).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({
        serverUrl: 'https://x.com',
        principalUrl: 'https://x.com/dav.php/principals/alice/',
        calendarHome: 'https://x.com/dav.php/calendars/alice/',
        serverType: 'baikal',
      }),
    );
  });

  it('falls back to username as displayName when server omits it', async () => {
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce([{ href: '', status: '', props: {} }]);

    const result = await connect('a1', 'https://x.com', 'alice', 'pw', 'baikal');

    expect(result.displayName).toBe('alice');
  });

  it('throws on 401 from final PROPFIND with auth-failed message', async () => {
    vi.mocked(http.propfind).mockReset().mockResolvedValueOnce(httpOk(401));

    await expect(connect('a1', 'https://x.com', 'alice', 'pw', 'baikal')).rejects.toThrow(
      /authentication failed/i,
    );
  });

  it('throws on non-207 from final PROPFIND', async () => {
    vi.mocked(http.propfind).mockReset().mockResolvedValueOnce(httpOk(500));

    await expect(connect('a1', 'https://x.com', 'alice', 'pw', 'baikal')).rejects.toThrow(
      /failed to connect: HTTP 500/i,
    );
  });
});

describe('connect — generic server URL path stripping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // generic flow makes 3 PROPFINDs: well-known (principal), principal (calendar-home),
    // and the final verify-principal. the discovery code uses regex matches against
    // the body, so include both principal and calendar-home-set hrefs
    const discoveryBody =
      '<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">' +
      '<d:response><d:propstat><d:prop>' +
      '<d:current-user-principal><d:href>/principals/alice/</d:href></d:current-user-principal>' +
      '<c:calendar-home-set><d:href>/calendars/alice/</d:href></c:calendar-home-set>' +
      '</d:prop></d:propstat></d:response></d:multistatus>';
    vi.mocked(http.propfind).mockImplementation(async () => httpOk(207, discoveryBody));
    vi.mocked(http.parseMultiStatus).mockReturnValue([
      { href: '', status: '', props: { displayname: 'Test User' } },
    ]);
  });

  it('strips /remote.php/dav from generic baseUrl', async () => {
    await connect('a1', 'https://x.com/remote.php/dav', 'alice', 'pw', 'generic');

    // first call should be to the stripped base + /.well-known/caldav
    expect(http.propfind).toHaveBeenCalledWith(
      'https://x.com/.well-known/caldav',
      expect.anything(),
      expect.anything(),
      '0',
    );
  });

  it('strips /dav.php from generic baseUrl', async () => {
    await connect('a1', 'https://x.com/dav.php', 'alice', 'pw', 'generic');

    expect(http.propfind).toHaveBeenCalledWith(
      'https://x.com/.well-known/caldav',
      expect.anything(),
      expect.anything(),
      '0',
    );
  });

  it('strips /caldav from generic baseUrl', async () => {
    await connect('a1', 'https://x.com/caldav', 'alice', 'pw', 'generic');

    expect(http.propfind).toHaveBeenCalledWith(
      'https://x.com/.well-known/caldav',
      expect.anything(),
      expect.anything(),
      '0',
    );
  });

  it('leaves baseUrl alone for non-generic server types', async () => {
    await connect('a1', 'https://x.com/dav.php', 'alice', 'pw', 'baikal');

    // for baikal we don't strip - the URLs use baseUrl as-is + /dav.php/principals/...
    expect(setConnection).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({ serverUrl: 'https://x.com/dav.php' }),
    );
  });
});
