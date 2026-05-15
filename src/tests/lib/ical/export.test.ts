import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/store/tags', () => ({ getAllTags: () => [] }));
vi.mock('$utils/misc', () => ({ generateUUID: () => 'fixed-uuid' }));

// formatDate normally needs the settings store; stub it to a deterministic format.
vi.mock('$utils/date', () => ({
  formatDate: (date: Date, withYear: boolean) =>
    withYear
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      : `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
}));

import {
  exportTaskAsIcs,
  exportTasksAsCsv,
  exportTasksAsIcs,
  exportTasksAsJson,
  exportTasksAsMarkdown,
} from '$lib/ical/export';
import { makeTask } from '../../fixtures';

describe('exportTaskAsIcs', () => {
  it('wraps a single task in a VCALENDAR', () => {
    const result = exportTaskAsIcs(makeTask({ uid: 'solo' }));

    expect(result).toContain('BEGIN:VCALENDAR');
    expect(result).toContain('END:VCALENDAR');
    expect(result).toContain('UID:solo');
  });

  it('includes child tasks as additional VTODOs', () => {
    const parent = makeTask({ uid: 'parent' });
    const child1 = makeTask({ uid: 'child1' });
    const child2 = makeTask({ uid: 'child2' });

    const result = exportTaskAsIcs(parent, [child1, child2]);

    expect(result).toContain('UID:parent');
    expect(result).toContain('UID:child1');
    expect(result).toContain('UID:child2');
    expect((result.match(/BEGIN:VTODO/g) ?? []).length).toBe(3);
  });
});

describe('exportTasksAsIcs', () => {
  it('produces a VCALENDAR with one VTODO per task', () => {
    const tasks = [makeTask({ uid: 'a' }), makeTask({ uid: 'b' }), makeTask({ uid: 'c' })];

    const result = exportTasksAsIcs(tasks);

    expect((result.match(/BEGIN:VTODO/g) ?? []).length).toBe(3);
  });

  it('produces a valid empty VCALENDAR for empty input', () => {
    const result = exportTasksAsIcs([]);

    expect(result).toContain('BEGIN:VCALENDAR');
    expect(result).toContain('END:VCALENDAR');
    expect(result).not.toContain('BEGIN:VTODO');
  });
});

describe('exportTasksAsJson', () => {
  it('produces pretty-printed JSON', () => {
    const tasks = [makeTask({ uid: 'a', title: 'A' })];

    const result = exportTasksAsJson(tasks);

    expect(result).toContain('"uid": "a"');
    expect(result).toContain('"title": "A"');
    // indent of 2 means inner object keys are at 4 spaces (2 for array + 2 for object)
    expect(result).toMatch(/\n {4}"uid":/);
  });

  it('round-trips through JSON.parse', () => {
    const tasks = [makeTask({ uid: 'a' }), makeTask({ uid: 'b' })];

    const result = exportTasksAsJson(tasks);
    const parsed = JSON.parse(result);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].uid).toBe('a');
  });
});

describe('exportTasksAsMarkdown', () => {
  it('uses correct checkbox per status', () => {
    const tasks = [
      makeTask({ title: 'A', status: 'needs-action' }),
      makeTask({ title: 'B', status: 'completed' }),
      makeTask({ title: 'C', status: 'cancelled' }),
    ];

    const result = exportTasksAsMarkdown(tasks);

    expect(result).toContain('[ ] A');
    expect(result).toContain('[x] B');
    expect(result).toContain('[-] C');
  });

  it('indents at the given level', () => {
    const result = exportTasksAsMarkdown([makeTask({ title: 'nested' })], 2);

    expect(result).toMatch(/^ {4}\[ \] nested/);
  });

  it('includes priority and due-date metadata when present', () => {
    const result = exportTasksAsMarkdown([
      makeTask({
        title: 'X',
        priority: 'high',
        dueDate: new Date(2025, 5, 1),
        categoryId: 'work',
      }),
    ]);

    expect(result).toContain('Priority: high');
    expect(result).toContain('Due: 2025-06-01');
    expect(result).toContain('Category: work');
  });

  it('omits priority metadata when none', () => {
    const result = exportTasksAsMarkdown([makeTask({ title: 'X', priority: 'none' })]);

    expect(result).not.toContain('Priority:');
  });

  it('appends description as a quoted block', () => {
    const result = exportTasksAsMarkdown([makeTask({ title: 'X', description: 'line 1\nline 2' })]);

    expect(result).toContain('> line 1');
    expect(result).toContain('> line 2');
  });

  it('returns empty string for no tasks', () => {
    expect(exportTasksAsMarkdown([])).toBe('');
  });
});

describe('exportTasksAsCsv', () => {
  it('includes a header row', () => {
    const result = exportTasksAsCsv([]);

    expect(result.split('\n')[0]).toBe(
      'Title,Description,Status,Priority,Due Date,Start Date,Category,Created,Modified',
    );
  });

  it('quotes titles and escapes embedded quotes', () => {
    const result = exportTasksAsCsv([makeTask({ title: 'has "quotes" inside', description: '' })]);

    expect(result).toContain('"has ""quotes"" inside"');
  });

  it('maps status to a human-readable label', () => {
    const tasks = [
      makeTask({ title: 'A', status: 'needs-action' }),
      makeTask({ title: 'B', status: 'in-process' }),
      makeTask({ title: 'C', status: 'completed' }),
      makeTask({ title: 'D', status: 'cancelled' }),
    ];

    const result = exportTasksAsCsv(tasks);

    expect(result).toContain('Needs Action');
    expect(result).toContain('In Process');
    expect(result).toContain('Completed');
    expect(result).toContain('Cancelled');
  });

  it('renders dates via formatDate when present, empty string when absent', () => {
    const result = exportTasksAsCsv([
      makeTask({ title: 'X', dueDate: new Date(2025, 5, 1), startDate: undefined }),
    ]);
    const lines = result.split('\n');
    const row = lines[1].split(',');

    // header order: Title, Description, Status, Priority, Due Date, Start Date, ...
    expect(row[4]).toBe('2025-06-01'); // dueDate
    expect(row[5]).toBe(''); // startDate (absent)
  });
});
