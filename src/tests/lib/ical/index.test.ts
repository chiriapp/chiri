import { describe, expect, it } from 'vitest';
import {
  escapeICalText,
  foldLine,
  formatICalDate,
  formatICalDateOnly,
  parseICalDate,
  parseProperty,
  unescapeICalText,
  unfoldLines,
} from '$lib/ical';

describe('formatICalDate', () => {
  it('formats a UTC datetime correctly', () => {
    const d = new Date(Date.UTC(2025, 11, 25, 12, 30, 45));
    expect(formatICalDate(d)).toBe('20251225T123045Z');
  });

  it('pads single-digit fields with zeros', () => {
    const d = new Date(Date.UTC(2025, 0, 5, 3, 4, 5));
    expect(formatICalDate(d)).toBe('20250105T030405Z');
  });

  it('handles midnight UTC', () => {
    const d = new Date(Date.UTC(2025, 0, 1, 0, 0, 0));
    expect(formatICalDate(d)).toBe('20250101T000000Z');
  });

  it('handles end-of-year', () => {
    const d = new Date(Date.UTC(2025, 11, 31, 23, 59, 59));
    expect(formatICalDate(d)).toBe('20251231T235959Z');
  });

  it('handles leap-year Feb 29', () => {
    const d = new Date(Date.UTC(2024, 1, 29, 12, 0, 0));
    expect(formatICalDate(d)).toBe('20240229T120000Z');
  });
});

describe('formatICalDateOnly', () => {
  it('formats a date as YYYYMMDD using local components', () => {
    const d = new Date(2025, 0, 15);
    expect(formatICalDateOnly(d)).toBe('20250115');
  });

  it('pads single-digit month/day', () => {
    const d = new Date(2025, 8, 3);
    expect(formatICalDateOnly(d)).toBe('20250903');
  });
});

describe('parseICalDate', () => {
  it('parses UTC datetime (Z suffix)', () => {
    const result = parseICalDate('20251225T123045Z');
    expect(result?.toISOString()).toBe('2025-12-25T12:30:45.000Z');
  });

  it('parses local datetime (no Z)', () => {
    const result = parseICalDate('20251225T120000');
    expect(result?.getFullYear()).toBe(2025);
    expect(result?.getMonth()).toBe(11);
    expect(result?.getDate()).toBe(25);
    expect(result?.getHours()).toBe(12);
  });

  it('parses date-only (YYYYMMDD)', () => {
    const result = parseICalDate('20251225');
    expect(result?.getFullYear()).toBe(2025);
    expect(result?.getMonth()).toBe(11);
    expect(result?.getDate()).toBe(25);
  });

  it('trims surrounding whitespace', () => {
    expect(parseICalDate('  20251225T120000Z  ')?.toISOString()).toBe('2025-12-25T12:00:00.000Z');
  });

  it('returns undefined for empty string', () => {
    expect(parseICalDate('')).toBeUndefined();
  });

  it('returns undefined for malformed input', () => {
    expect(parseICalDate('garbage')).toBeUndefined();
    expect(parseICalDate('2025-12-25')).toBeUndefined(); // ISO format not iCal
    expect(parseICalDate('20251225T12:00:00Z')).toBeUndefined();
    expect(parseICalDate('20251225T120000')).toBeDefined(); // local datetime ok
    expect(parseICalDate('202512')).toBeUndefined(); // too short
    expect(parseICalDate('202512250')).toBeUndefined(); // too long for date-only
  });

  it('parses leap-year Feb 29', () => {
    const result = parseICalDate('20240229');
    expect(result?.getMonth()).toBe(1);
    expect(result?.getDate()).toBe(29);
  });

  it('returns undefined for invalid calendar dates', () => {
    expect(parseICalDate('20250230')).toBeUndefined(); // Feb 30
    expect(parseICalDate('20251301')).toBeUndefined(); // month 13
    expect(parseICalDate('20250132')).toBeUndefined(); // day 32
    expect(parseICalDate('20250229')).toBeUndefined(); // Feb 29 non-leap
    expect(parseICalDate('20250230T120000')).toBeUndefined();
    expect(parseICalDate('20250230T120000Z')).toBeUndefined();
  });
});

describe('escapeICalText / unescapeICalText', () => {
  it('escapes backslash, semicolon, comma, and newline', () => {
    expect(escapeICalText('a;b,c\nd\\e')).toBe('a\\;b\\,c\\nd\\\\e');
  });

  it('escapes empty string to empty string', () => {
    expect(escapeICalText('')).toBe('');
  });

  it('roundtrips for plain text', () => {
    const input = 'plain text with no specials';
    expect(unescapeICalText(escapeICalText(input))).toBe(input);
  });

  it('roundtrips for text with all special chars', () => {
    const input = 'a;b,c\nd\\e';
    expect(unescapeICalText(escapeICalText(input))).toBe(input);
  });

  it('roundtrips for adjacent escapes', () => {
    const input = '\\\\;;,,\n\n';
    expect(unescapeICalText(escapeICalText(input))).toBe(input);
  });

  it('handles unicode correctly', () => {
    const input = '✓ Café — naïve;😀';
    expect(unescapeICalText(escapeICalText(input))).toBe(input);
  });

  it('unescape handles literal escapes in input', () => {
    expect(unescapeICalText('\\\\;\\n')).toBe('\\;\n');
  });
});

describe('foldLine', () => {
  it('leaves a line under 75 chars unchanged', () => {
    const line = 'a'.repeat(75);
    expect(foldLine(line)).toBe(line);
  });

  it('folds a 76-char line into two', () => {
    const line = 'a'.repeat(76);
    const result = foldLine(line);
    expect(result).toBe(`${'a'.repeat(75)}\r\n a`);
  });

  it('folds long lines into multiple continuation lines', () => {
    // 75 + 74 + 74 = 223 chars, expect 3 lines
    const line = 'a'.repeat(223);
    const result = foldLine(line);
    const parts = result.split('\r\n');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toHaveLength(75);
    expect(parts[1]).toMatch(/^ /);
    expect(parts[1]).toHaveLength(75); // 1 leading space + 74 chars
    expect(parts[2]).toMatch(/^ /);
  });

  it('handles empty string', () => {
    expect(foldLine('')).toBe('');
  });

  it('joins back to the original after unfolding', () => {
    const line = 'x'.repeat(200);
    expect(unfoldLines(foldLine(line))).toBe(line);
  });
});

describe('unfoldLines', () => {
  it('joins lines starting with space', () => {
    expect(unfoldLines('hello\r\n world')).toBe('helloworld');
  });

  it('joins lines starting with tab', () => {
    expect(unfoldLines('hello\r\n\tworld')).toBe('helloworld');
  });

  it('normalizes LF-only line endings', () => {
    expect(unfoldLines('hello\n world')).toBe('helloworld');
  });

  it('normalizes CR-only line endings (old Mac)', () => {
    expect(unfoldLines('hello\r world')).toBe('helloworld');
  });

  it('handles mixed line endings', () => {
    expect(unfoldLines('a\r\n b\n c\r d')).toBe('abcd');
  });

  it('leaves non-folded lines alone', () => {
    expect(unfoldLines('line1\r\nline2\r\nline3')).toBe('line1\nline2\nline3');
  });
});

describe('parseProperty', () => {
  it('parses a simple property with no params', () => {
    expect(parseProperty('SUMMARY:Hello')).toEqual({ name: 'SUMMARY', params: {}, value: 'Hello' });
  });

  it('parses a property with one param', () => {
    expect(parseProperty('DTSTART;TZID=America/New_York:20251225T120000')).toEqual({
      name: 'DTSTART',
      params: { TZID: 'America/New_York' },
      value: '20251225T120000',
    });
  });

  it('parses a property with multiple params', () => {
    const result = parseProperty('ATTACH;FMTTYPE=text/plain;ENCODING=BASE64:abc==');
    expect(result?.name).toBe('ATTACH');
    expect(result?.params).toEqual({ FMTTYPE: 'text/plain', ENCODING: 'BASE64' });
    expect(result?.value).toBe('abc==');
  });

  it('strips quotes from quoted param values', () => {
    expect(parseProperty('FOO;BAR="quoted value":bar')?.params).toEqual({ BAR: 'quoted value' });
  });

  it('uppercases the property name and param names', () => {
    expect(parseProperty('summary;tzid=utc:Hello')).toEqual({
      name: 'SUMMARY',
      params: { TZID: 'utc' },
      value: 'Hello',
    });
  });

  it('returns null when there is no colon', () => {
    expect(parseProperty('NO_COLON_HERE')).toBeNull();
  });

  it('handles a value containing colons (only first colon is the separator)', () => {
    expect(parseProperty('URL:https://example.com:8080/path')?.value).toBe(
      'https://example.com:8080/path',
    );
  });

  it('handles empty value', () => {
    expect(parseProperty('FOO:')).toEqual({ name: 'FOO', params: {}, value: '' });
  });

  it('ignores params without an equals sign', () => {
    expect(parseProperty('FOO;NOEQUALS:bar')).toEqual({ name: 'FOO', params: {}, value: 'bar' });
  });
});
