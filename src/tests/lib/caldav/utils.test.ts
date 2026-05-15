import { describe, expect, it } from 'vitest';
import { cleanEtag, makeAbsoluteUrl, normalizeUrl } from '$lib/caldav/utils';

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

  it('only strips one trailing slash — leaves multiple', () => {
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
