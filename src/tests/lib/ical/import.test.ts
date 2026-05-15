import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/store/tags', () => ({ getAllTags: () => [] }));
let uuidCounter = 0;
vi.mock('$utils/misc', () => ({
  generateUUID: () => `uuid-${++uuidCounter}`,
}));

import { parseIcsFile, parseJsonTasksFile, parseTasksOrgBackup } from '$lib/ical/import';

const wrapVTodo = (lines: string[]) =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VTODO', ...lines, 'END:VTODO', 'END:VCALENDAR'].join(
    '\r\n',
  );

describe('parseIcsFile', () => {
  it('returns [] for empty input', () => {
    expect(parseIcsFile('')).toEqual([]);
  });

  it('returns [] for malformed input (no VTODO)', () => {
    expect(parseIcsFile('BEGIN:VCALENDAR\nEND:VCALENDAR')).toEqual([]);
  });

  it('parses a single VTODO without accountId or calendarId', () => {
    const result = parseIcsFile(wrapVTodo(['UID:imp-1', 'SUMMARY:Imported']));

    expect(result).toHaveLength(1);
    expect(result[0].uid).toBe('imp-1');
    expect(result[0].title).toBe('Imported');
    expect(result[0].accountId).toBeUndefined();
    expect(result[0].calendarId).toBeUndefined();
    expect(result[0].synced).toBe(false);
  });

  it('parses multiple VTODOs in one file', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VTODO',
      'UID:a',
      'SUMMARY:A',
      'END:VTODO',
      'BEGIN:VTODO',
      'UID:b',
      'SUMMARY:B',
      'END:VTODO',
      'END:VCALENDAR',
    ].join('\r\n');

    const result = parseIcsFile(ics);

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.uid)).toEqual(['a', 'b']);
  });
});

describe('parseTasksOrgBackup', () => {
  const wrap = (vtodoString: string) => ({
    data: { tasks: [{ vtodo: vtodoString }] },
  });

  it("extracts tasks from each entry's vtodo string", () => {
    const data = wrap(wrapVTodo(['UID:org-1', 'SUMMARY:From Tasks.org']));

    const result = parseTasksOrgBackup(data);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('From Tasks.org');
  });

  it('skips entries with missing vtodo field', () => {
    const data = {
      data: {
        tasks: [{ vtodo: wrapVTodo(['UID:a', 'SUMMARY:A']) }, { vtodo: '' }],
      },
    };

    const result = parseTasksOrgBackup(data);

    expect(result).toHaveLength(1);
  });

  it('returns [] when entries[].vtodo parses to nothing', () => {
    const data = {
      data: { tasks: [{ vtodo: 'not-a-vtodo' }] },
    };

    expect(parseTasksOrgBackup(data)).toEqual([]);
  });
});

describe('parseJsonTasksFile', () => {
  it('detects Tasks.org backup format and parses it', () => {
    const json = JSON.stringify({
      data: { tasks: [{ vtodo: wrapVTodo(['UID:x', 'SUMMARY:X']) }] },
    });

    const result = parseJsonTasksFile(json);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('X');
  });

  it('parses a direct array of tasks and regenerates ids', () => {
    const tasks = [
      { id: 'original-id', uid: 'u', title: 'A', synced: true },
      { id: 'original-id-2', uid: 'u2', title: 'B', synced: true },
    ];
    const json = JSON.stringify(tasks);

    const result = parseJsonTasksFile(json);

    expect(result).toHaveLength(2);
    // ids should be regenerated (new UUIDs), not preserved
    expect(result[0].id).not.toBe('original-id');
    expect(result[1].id).not.toBe('original-id-2');
    // synced is forced to false regardless of input
    expect(result[0].synced).toBe(false);
    expect(result[1].synced).toBe(false);
    // other fields preserved
    expect(result[0].title).toBe('A');
  });

  it('returns [] for an unrecognized JSON shape', () => {
    expect(parseJsonTasksFile(JSON.stringify({ random: 'object' }))).toEqual([]);
  });

  it('returns [] for invalid JSON (catch block)', () => {
    expect(parseJsonTasksFile('not json {')).toEqual([]);
  });

  it('returns [] for empty string', () => {
    expect(parseJsonTasksFile('')).toEqual([]);
  });
});
