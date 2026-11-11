import { describe, expect, it } from 'vitest';
import {
  cleanEtag,
  hasHttpUrlScheme,
  isValidPrincipalUrlOverride,
  makeAbsoluteUrl,
  normalizeHttpServerUrl,
  normalizeUrl,
  parseCalDAVServerUrl,
  usernameFromPrincipalUrl,
} from '$lib/caldav/utils';

describe('cleanEtag', () => {
  it('strips surrounding double quotes', () => {
    expect(cleanEtag('"abc-123"')).toBe('abc-123');
  });

  it('strips quotes from anywhere in the string (not just edges)', () => {
    expect(cleanEtag('"abc"-"123"')).toBe('abc-123');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(cleanEtag(null)).toBe('');
    expect(cleanEtag(undefined)).toBe('');
    expect(cleanEtag('')).toBe('');
  });

  it('returns input unchanged when no quotes present', () => {
    expect(cleanEtag('abc-123')).toBe('abc-123');
  });

  it('handles weak etag marker', () => {
    // W/"abc" → W/abc (quote stripping only. weak marker preserved)
    expect(cleanEtag('W/"abc-123"')).toBe('W/abc-123');
  });

  it('handles etag containing only quotes', () => {
    expect(cleanEtag('""')).toBe('');
    expect(cleanEtag('"""')).toBe('');
  });

  it('preserves unicode and special characters inside etags', () => {
    expect(cleanEtag('"abc-✓-€"')).toBe('abc-✓-€');
  });
});

describe('normalizeUrl', () => {
  it('strips a single trailing slash', () => {
    expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
  });

  it('only strips one trailing slash, leaves multiple', () => {
    expect(normalizeUrl('https://example.com/path//')).toBe('https://example.com/path/');
  });

  it('leaves urls without trailing slash unchanged', () => {
    expect(normalizeUrl('https://example.com/path')).toBe('https://example.com/path');
  });

  it('handles bare hostnames', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('handles empty string', () => {
    expect(normalizeUrl('')).toBe('');
  });

  it('handles root-only "/"', () => {
    expect(normalizeUrl('/')).toBe('');
  });

  it('preserves query strings and fragments', () => {
    expect(normalizeUrl('https://example.com/path?foo=bar')).toBe(
      'https://example.com/path?foo=bar',
    );
    expect(normalizeUrl('https://example.com/path#section')).toBe(
      'https://example.com/path#section',
    );
  });
});

describe('hasHttpUrlScheme', () => {
  it('accepts http and https urls', () => {
    expect(hasHttpUrlScheme('http://example.com')).toBe(true);
    expect(hasHttpUrlScheme('https://example.com')).toBe(true);
  });

  it('rejects scheme-less hosts', () => {
    expect(hasHttpUrlScheme('example.com')).toBe(false);
  });

  it('trims whitespace before checking', () => {
    expect(hasHttpUrlScheme('  https://example.com/caldav  ')).toBe(true);
  });

  it('rejects other URL schemes', () => {
    expect(hasHttpUrlScheme('webcal://example.com')).toBe(false);
  });
});

describe('makeAbsoluteUrl', () => {
  it('returns absolute https urls unchanged', () => {
    expect(makeAbsoluteUrl('https://other.com/path', 'https://example.com')).toBe(
      'https://other.com/path',
    );
  });

  it('returns absolute http urls unchanged', () => {
    expect(makeAbsoluteUrl('http://other.com/path', 'https://example.com')).toBe(
      'http://other.com/path',
    );
  });

  it('resolves relative paths against the base url', () => {
    expect(makeAbsoluteUrl('/calendar/task.ics', 'https://example.com')).toBe(
      'https://example.com/calendar/task.ics',
    );
  });

  it('resolves relative paths preserving base path', () => {
    expect(makeAbsoluteUrl('task.ics', 'https://example.com/calendars/')).toBe(
      'https://example.com/calendars/task.ics',
    );
  });

  it('handles parent-directory paths (..)', () => {
    expect(makeAbsoluteUrl('../other', 'https://example.com/a/b/')).toBe(
      'https://example.com/a/other',
    );
  });

  it('treats "http"-prefixed paths as absolute (even though substring-based)', () => {
    // documents the current behavior: any href starting with "http" is treated as absolute
    expect(makeAbsoluteUrl('https://x.example', 'https://base.com')).toBe('https://x.example');
  });

  it('throws on truly invalid base url for relative input', () => {
    expect(() => makeAbsoluteUrl('/path', 'not a url at all')).toThrow();
  });
});

describe('parseCalDAVServerUrl', () => {
  it('accepts valid HTTP(S) CalDAV server URLs', () => {
    const https = parseCalDAVServerUrl(' https://caldav.example.com:8443/dav/ ');
    const http = parseCalDAVServerUrl('http://localhost:5232');
    const pathWithColon = parseCalDAVServerUrl('https://caldav.example.com/dav:0/');

    expect(https.ok && https.url.origin).toBe('https://caldav.example.com:8443');
    expect(http.ok && http.url.origin).toBe('http://localhost:5232');
    expect(pathWithColon.ok && pathWithColon.url.pathname).toBe('/dav:0/');
  });

  it.each([
    ['', 'missing-url'],
    ['example.com', 'invalid-url'],
    ['ftp://example.com', 'unsupported-scheme'],
    ['https://alice:secret@example.com', 'embedded-credentials'],
    ['https://example.com:0', 'invalid-port'],
    ['https://example.com:65536', 'invalid-port'],
  ] as const)('rejects %s with %s', (value, reason) => {
    expect(parseCalDAVServerUrl(value)).toEqual({ ok: false, reason });
  });
});

describe('isValidPrincipalUrlOverride', () => {
  const baseUrl = 'https://caldav.example.com';

  it('accepts empty values', () => {
    expect(isValidPrincipalUrlOverride('', baseUrl)).toBe(true);
    expect(isValidPrincipalUrlOverride('   ', baseUrl)).toBe(true);
  });

  it('accepts absolute http and https URLs', () => {
    expect(
      isValidPrincipalUrlOverride('https://caldav.example.com/principals/alice/', baseUrl),
    ).toBe(true);
    expect(isValidPrincipalUrlOverride('http://localhost:5232/principals/alice/', baseUrl)).toBe(
      true,
    );
  });

  it('accepts server-relative paths', () => {
    expect(isValidPrincipalUrlOverride('/principals/alice/', baseUrl)).toBe(true);
    expect(isValidPrincipalUrlOverride('principals/alice/', `${baseUrl}/dav/`)).toBe(true);
  });

  it('rejects scheme-relative URLs', () => {
    expect(isValidPrincipalUrlOverride('//evil.example/principals/alice/', baseUrl)).toBe(false);
  });

  it('rejects unsupported schemes', () => {
    expect(isValidPrincipalUrlOverride('ftp://example.com/principals/alice/', baseUrl)).toBe(false);
    expect(isValidPrincipalUrlOverride('mailto:alice@example.com', baseUrl)).toBe(false);
  });

  it('rejects embedded credentials', () => {
    expect(
      isValidPrincipalUrlOverride('https://alice:secret@example.com/principals/alice/', baseUrl),
    ).toBe(false);
  });

  it('rejects values that cannot resolve against the server URL', () => {
    expect(isValidPrincipalUrlOverride('/principals/alice/', 'not a url')).toBe(false);
  });
});

describe('normalizeHttpServerUrl', () => {
  it('preserves explicit http and https schemes', () => {
    expect(normalizeHttpServerUrl('http://localhost:8080')).toBe('http://localhost:8080');
    expect(normalizeHttpServerUrl('https://cloud.example.com')).toBe('https://cloud.example.com');
  });

  it('trims whitespace and strips one trailing slash', () => {
    expect(normalizeHttpServerUrl('  https://cloud.example.com/  ')).toBe(
      'https://cloud.example.com',
    );
  });

  it('rejects scheme-less urls', () => {
    expect(() => normalizeHttpServerUrl('cloud.example.com')).toThrow(
      /must start with http:\/\/ or https:\/\//i,
    );
  });
});

describe('usernameFromPrincipalUrl', () => {
  it('extracts the account identifier from a principal URL', () => {
    expect(
      usernameFromPrincipalUrl(
        'https://caldav.fastmail.com/dav/principals/user/user@fastmail.com/',
      ),
    ).toBe('user@fastmail.com');
    expect(usernameFromPrincipalUrl('http://localhost:8083/dav/pal/unit-tests@example.test/')).toBe(
      'unit-tests@example.test',
    );
  });

  it('returns the last path segment when it is not an email', () => {
    expect(usernameFromPrincipalUrl('https://caldav.example.com/dav/principals/alice')).toBe(
      'alice',
    );
  });
});
