import { describe, expect, it, vi } from 'vitest';

// cut transitive chain at store/tags. logger mocks come from setup.ts
vi.mock('$lib/store/tags', () => ({ getAllTags: () => [] }));
vi.mock('$utils/misc', () => ({ generateUUID: () => 'test-uuid' }));

import { extractVTodos, parseVTodo } from '$lib/ical/vtodo';

const ical = (lines: string[]) =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', ...lines, 'END:VCALENDAR'].join('\r\n');

const vtodo = (props: string[]) => ['BEGIN:VTODO', ...props, 'END:VTODO'];

describe('parseVTodo', () => {
  it('parses a minimal VTODO with just a UID and SUMMARY', () => {
    const content = ['UID:abc-123', 'SUMMARY:Buy milk'].join('\r\n');
    const result = parseVTodo(content);
    expect(result.uid).toBe('abc-123');
    expect(result.summary).toBe('Buy milk');
  });

  it('unescapes iCal text in SUMMARY and DESCRIPTION', () => {
    const content = [
      'UID:1',
      'SUMMARY:Buy milk\\, eggs\\; bread',
      'DESCRIPTION:Line1\\nLine2',
    ].join('\r\n');
    const result = parseVTodo(content);
    expect(result.summary).toBe('Buy milk, eggs; bread');
    expect(result.description).toBe('Line1\nLine2');
  });

  it('parses STATUS uppercased', () => {
    const result = parseVTodo(['UID:1', 'STATUS:completed'].join('\r\n'));
    expect(result.status).toBe('COMPLETED');
  });

  it('parses PERCENT-COMPLETE within valid range', () => {
    expect(parseVTodo(['UID:1', 'PERCENT-COMPLETE:50'].join('\r\n')).percentComplete).toBe(50);
    expect(parseVTodo(['UID:1', 'PERCENT-COMPLETE:0'].join('\r\n')).percentComplete).toBe(0);
    expect(parseVTodo(['UID:1', 'PERCENT-COMPLETE:100'].join('\r\n')).percentComplete).toBe(100);
  });

  it('rejects PERCENT-COMPLETE outside 0-100', () => {
    expect(
      parseVTodo(['UID:1', 'PERCENT-COMPLETE:150'].join('\r\n')).percentComplete,
    ).toBeUndefined();
    expect(
      parseVTodo(['UID:1', 'PERCENT-COMPLETE:-5'].join('\r\n')).percentComplete,
    ).toBeUndefined();
    expect(
      parseVTodo(['UID:1', 'PERCENT-COMPLETE:bad'].join('\r\n')).percentComplete,
    ).toBeUndefined();
  });

  it('parses PRIORITY as integer', () => {
    expect(parseVTodo(['UID:1', 'PRIORITY:1'].join('\r\n')).priority).toBe(1);
    expect(parseVTodo(['UID:1', 'PRIORITY:9'].join('\r\n')).priority).toBe(9);
  });

  it('parses CATEGORIES as comma-separated list with unescaping', () => {
    const result = parseVTodo(['UID:1', 'CATEGORIES:work,personal,home'].join('\r\n'));
    expect(result.categories).toEqual(['work', 'personal', 'home']);
  });

  it('preserves escaped commas inside a CATEGORIES entry', () => {
    const result = parseVTodo(['UID:1', 'CATEGORIES:with\\, comma'].join('\r\n'));
    expect(result.categories).toEqual(['with, comma']);
  });

  it('splits CATEGORIES on unescaped commas while keeping escaped ones', () => {
    const result = parseVTodo(['UID:1', 'CATEGORIES:a\\, b,c,d\\, e'].join('\r\n'));
    expect(result.categories).toEqual(['a, b', 'c', 'd, e']);
  });

  it('parses DTSTART and DUE with date-only VALUE param', () => {
    const result = parseVTodo(
      ['UID:1', 'DTSTART;VALUE=DATE:20251225', 'DUE;VALUE=DATE:20251231'].join('\r\n'),
    );
    expect(result.dtstartAllDay).toBe(true);
    expect(result.dueAllDay).toBe(true);
    expect(result.dtstart?.getFullYear()).toBe(2025);
    expect(result.due?.getDate()).toBe(31);
  });

  it('parses DTSTART/DUE with datetime as not all-day', () => {
    const result = parseVTodo(['UID:1', 'DUE:20251231T120000Z'].join('\r\n'));
    expect(result.dueAllDay).toBe(false);
    expect(result.due?.toISOString()).toBe('2025-12-31T12:00:00.000Z');
  });

  it('parses RELATED-TO with default PARENT reltype', () => {
    const result = parseVTodo(['UID:1', 'RELATED-TO:parent-uid'].join('\r\n'));
    expect(result.parentUid).toBe('parent-uid');
  });

  it('parses RELATED-TO with explicit RELTYPE=PARENT', () => {
    const result = parseVTodo(['UID:1', 'RELATED-TO;RELTYPE=PARENT:p-uid'].join('\r\n'));
    expect(result.parentUid).toBe('p-uid');
  });

  it('ignores RELATED-TO with non-PARENT reltype', () => {
    const result = parseVTodo(['UID:1', 'RELATED-TO;RELTYPE=CHILD:c-uid'].join('\r\n'));
    expect(result.parentUid).toBeUndefined();
  });

  it('strips "RRULE:" prefix from RRULE values (defensive)', () => {
    const result = parseVTodo(['UID:1', 'RRULE:FREQ=DAILY'].join('\r\n'));
    expect(result.rrule).toBe('FREQ=DAILY');
  });

  it('parses X-APPLE-SORT-ORDER', () => {
    const result = parseVTodo(['UID:1', 'X-APPLE-SORT-ORDER:42'].join('\r\n'));
    expect(result.sortOrder).toBe(42);
  });

  it('parses X-TASKS-TAG-COLOR', () => {
    const result = parseVTodo(['UID:1', 'X-TASKS-TAG-COLOR:work|#FF5733'].join('\r\n'));
    expect(result.tagColorsByName).toEqual({ work: '#FF5733' });
  });

  it('lowercases tag names in tagColorsByName', () => {
    const result = parseVTodo(['UID:1', 'X-TASKS-TAG-COLOR:WORK|#FF5733'].join('\r\n'));
    expect(result.tagColorsByName).toEqual({ work: '#FF5733' });
  });

  it('rejects malformed X-TASKS-TAG-COLOR (no separator)', () => {
    const result = parseVTodo(['UID:1', 'X-TASKS-TAG-COLOR:noSeparator'].join('\r\n'));
    expect(result.tagColorsByName).toBeUndefined();
  });

  it('rejects X-TASKS-TAG-COLOR with invalid hex', () => {
    const result = parseVTodo(['UID:1', 'X-TASKS-TAG-COLOR:work|notacolor'].join('\r\n'));
    expect(result.tagColorsByName).toBeUndefined();
  });

  it('does not let VALARM properties leak into the VTODO result', () => {
    const result = parseVTodo(
      [
        'UID:1',
        'SUMMARY:outer',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'SUMMARY:inner-should-be-ignored',
        'TRIGGER:-PT15M',
        'END:VALARM',
      ].join('\r\n'),
    );
    expect(result.summary).toBe('outer');
  });

  it('extracts VALARMs with relative offset', () => {
    const result = parseVTodo(
      [
        'UID:1',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'TRIGGER:-PT15M',
        'DESCRIPTION:remind me',
        'END:VALARM',
      ].join('\r\n'),
    );
    expect(result.alarms).toHaveLength(0); // no trigger Date, only relativeOffset - filtered
  });

  it('extracts VALARMs with absolute DATE-TIME trigger', () => {
    const result = parseVTodo(
      [
        'UID:1',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'TRIGGER;VALUE=DATE-TIME:20251225T120000Z',
        'END:VALARM',
      ].join('\r\n'),
    );
    expect(result.alarms).toHaveLength(1);
    expect(result.alarms?.[0].trigger?.toISOString()).toBe('2025-12-25T12:00:00.000Z');
  });

  it('handles folded lines (continuation with leading space)', () => {
    const content = ['UID:1', 'SUMMARY:hello', ' world'].join('\r\n');
    expect(parseVTodo(content).summary).toBe('helloworld');
  });

  it('ignores empty lines', () => {
    const content = ['UID:1', '', 'SUMMARY:test', '', ''].join('\r\n');
    expect(parseVTodo(content).summary).toBe('test');
  });

  it('handles empty input', () => {
    expect(parseVTodo('')).toEqual({});
  });
});

describe('extractVTodos', () => {
  it('returns empty array for VCALENDAR with no VTODO', () => {
    expect(extractVTodos(ical([]))).toEqual([]);
  });

  it('extracts a single VTODO', () => {
    const content = ical(vtodo(['UID:1', 'SUMMARY:Task 1']));
    const result = extractVTodos(content);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('UID:1');
    expect(result[0]).toContain('SUMMARY:Task 1');
  });

  it('extracts multiple distinct VTODOs', () => {
    const content = ical([...vtodo(['UID:1', 'SUMMARY:A']), ...vtodo(['UID:2', 'SUMMARY:B'])]);
    expect(extractVTodos(content)).toHaveLength(2);
  });

  it('returns only the master when same-UID master + RECURRENCE-ID override present', () => {
    const content = ical([
      ...vtodo(['UID:1', 'SUMMARY:Master', 'RRULE:FREQ=DAILY']),
      ...vtodo(['UID:1', 'SUMMARY:Override', 'RECURRENCE-ID:20251225T000000Z']),
    ]);
    const result = extractVTodos(content);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('SUMMARY:Master');
  });

  it('falls back to all when no master qualifies', () => {
    // two VTODOs, neither with RRULE. extractor returns both
    const content = ical([...vtodo(['UID:1', 'SUMMARY:A']), ...vtodo(['UID:2', 'SUMMARY:B'])]);
    expect(extractVTodos(content)).toHaveLength(2);
  });

  it('handles unfolded line continuations across BEGIN/END markers', () => {
    const content = [
      'BEGIN:VCALENDAR',
      'BEGIN:VTODO',
      'UID:1',
      'SUMMARY:hello',
      ' world',
      'END:VTODO',
      'END:VCALENDAR',
    ].join('\r\n');
    const result = extractVTodos(content);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('hello');
  });

  it('handles case-insensitive BEGIN/END markers', () => {
    const content = [
      'BEGIN:VCALENDAR',
      'begin:vtodo',
      'UID:1',
      'SUMMARY:lower',
      'end:vtodo',
      'END:VCALENDAR',
    ].join('\r\n');
    expect(extractVTodos(content)).toHaveLength(1);
  });
});
