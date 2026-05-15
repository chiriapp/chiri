import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/store/tags', () => ({ getAllTags: () => [] }));
// generateUUID is non-deterministic; pin it so id/uid checks stay simple
let uuidCounter = 0;
vi.mock('$utils/misc', () => ({
  generateUUID: () => `uuid-${++uuidCounter}`,
}));

import {
  generateVCalendar,
  generateVTodo,
  parsedVTodoToTask,
  taskToVTodo,
  vtodoToTask,
} from '$lib/ical/vtodo';
import { makeTask } from '../../fixtures';

describe('parsedVTodoToTask', () => {
  it('maps a minimal parsed VTODO to a Task', () => {
    const result = parsedVTodoToTask(
      { uid: 'abc', summary: 'Buy milk' },
      { accountId: 'acct', calendarId: 'cal', synced: true },
    );

    expect(result.uid).toBe('abc');
    expect(result.title).toBe('Buy milk');
    expect(result.accountId).toBe('acct');
    expect(result.calendarId).toBe('cal');
    expect(result.synced).toBe(true);
  });

  it('defaults title to "Untitled Task" when summary missing', () => {
    const result = parsedVTodoToTask(
      { uid: 'abc' },
      { accountId: 'acct', calendarId: 'cal', synced: true },
    );

    expect(result.title).toBe('Untitled Task');
  });

  it('generates a uid when parsed VTODO has none', () => {
    const result = parsedVTodoToTask({}, { accountId: 'a', calendarId: 'c', synced: false });

    expect(result.uid).toMatch(/^uuid-/);
  });

  it('maps iCal STATUS to TaskStatus', () => {
    const tests: [string, string][] = [
      ['COMPLETED', 'completed'],
      ['IN-PROCESS', 'in-process'],
      ['CANCELLED', 'cancelled'],
      ['NEEDS-ACTION', 'needs-action'],
      ['unknown-status', 'needs-action'], // fallback
    ];

    for (const [icalStatus, expected] of tests) {
      const result = parsedVTodoToTask(
        { uid: 'x', status: icalStatus },
        { accountId: 'a', calendarId: 'c', synced: true },
      );
      expect(result.status).toBe(expected);
    }
  });

  it('derives `completed: true` only when status is completed', () => {
    const completed = parsedVTodoToTask(
      { uid: 'x', status: 'COMPLETED' },
      { accountId: 'a', calendarId: 'c', synced: true },
    );
    const inProgress = parsedVTodoToTask(
      { uid: 'x', status: 'IN-PROCESS' },
      { accountId: 'a', calendarId: 'c', synced: true },
    );

    expect(completed.completed).toBe(true);
    expect(inProgress.completed).toBe(false);
  });

  it('maps iCal PRIORITY (1-9) to Priority', () => {
    const tests: [number, string][] = [
      [0, 'none'],
      [1, 'high'],
      [4, 'high'],
      [5, 'medium'],
      [6, 'low'],
      [9, 'low'],
    ];

    for (const [icalPri, expected] of tests) {
      const result = parsedVTodoToTask(
        { uid: 'x', priority: icalPri },
        { accountId: 'a', calendarId: 'c', synced: true },
      );
      expect(result.priority).toBe(expected);
    }
  });

  it('joins categories into a comma-separated categoryId', () => {
    const result = parsedVTodoToTask(
      { uid: 'x', categories: ['work', 'personal'] },
      { accountId: 'a', calendarId: 'c', synced: true },
    );

    expect(result.categoryId).toBe('work,personal');
  });

  it('uses parsed.sortOrder when present', () => {
    const result = parsedVTodoToTask(
      { uid: 'x', sortOrder: 12345 },
      { accountId: 'a', calendarId: 'c', synced: true },
    );

    expect(result.sortOrder).toBe(12345);
  });

  it('falls back to Apple-epoch of createdAt when sortOrder missing', () => {
    const created = new Date(Date.UTC(2025, 0, 1));
    const result = parsedVTodoToTask(
      { uid: 'x', created },
      { accountId: 'a', calendarId: 'c', synced: true },
    );

    // Apple epoch is Jan 1 2001 UTC. createdAt = Jan 1 2025 UTC = 24 years later.
    expect(result.sortOrder).toBeGreaterThan(0);
    // sortOrder is in Apple-epoch seconds (~24 years × 31_557_600s)
    expect(result.sortOrder).toBeGreaterThan(700_000_000);
  });

  it('ignores NaN sortOrder and uses Apple epoch fallback', () => {
    const result = parsedVTodoToTask(
      { uid: 'x', sortOrder: NaN, created: new Date(Date.UTC(2025, 0, 1)) },
      { accountId: 'a', calendarId: 'c', synced: true },
    );

    expect(Number.isNaN(result.sortOrder)).toBe(false);
  });

  it('builds reminders from alarms with triggers only', () => {
    const trigger = new Date(Date.UTC(2025, 5, 1, 12));
    const result = parsedVTodoToTask(
      {
        uid: 'x',
        alarms: [
          { action: 'DISPLAY', trigger },
          { action: 'DISPLAY', description: 'no trigger here' }, // filtered out
        ],
      },
      { accountId: 'a', calendarId: 'c', synced: true },
    );

    expect(result.reminders).toHaveLength(1);
    expect(result.reminders?.[0].trigger).toEqual(trigger);
  });

  it('filters out default CalDAV descriptions', () => {
    const result = parsedVTodoToTask(
      { uid: 'x', description: 'Default Chiri description' },
      { accountId: 'a', calendarId: 'c', synced: true },
    );

    expect(result.description).toBe('');
  });

  it('preserves real descriptions', () => {
    const result = parsedVTodoToTask(
      { uid: 'x', description: 'Buy 2% milk' },
      { accountId: 'a', calendarId: 'c', synced: true },
    );

    expect(result.description).toBe('Buy 2% milk');
  });

  it('passes through href and etag from overrides', () => {
    const result = parsedVTodoToTask(
      { uid: 'x' },
      {
        accountId: 'a',
        calendarId: 'c',
        href: 'https://x.com/cal/x.ics',
        etag: 'tag123',
        synced: true,
      },
    );

    expect(result.href).toBe('https://x.com/cal/x.ics');
    expect(result.etag).toBe('tag123');
  });

  it('preserves parentUid and rrule', () => {
    const result = parsedVTodoToTask(
      { uid: 'x', parentUid: 'p-uid', rrule: 'FREQ=DAILY' },
      { accountId: 'a', calendarId: 'c', synced: true },
    );

    expect(result.parentUid).toBe('p-uid');
    expect(result.rrule).toBe('FREQ=DAILY');
  });
});

describe('vtodoToTask', () => {
  it('parses a wrapped VCALENDAR and returns a Task', () => {
    const ical = [
      'BEGIN:VCALENDAR',
      'BEGIN:VTODO',
      'UID:abc',
      'SUMMARY:Hi',
      'END:VTODO',
      'END:VCALENDAR',
    ].join('\r\n');

    const result = vtodoToTask(ical, 'acct', 'cal', 'href', 'etag');

    expect(result?.uid).toBe('abc');
    expect(result?.title).toBe('Hi');
    expect(result?.synced).toBe(true);
  });

  it('returns null when no VTODO is found', () => {
    const ical = 'BEGIN:VCALENDAR\r\nEND:VCALENDAR';

    expect(vtodoToTask(ical, 'a', 'c')).toBeNull();
  });

  it('returns null when input is empty', () => {
    expect(vtodoToTask('', 'a', 'c')).toBeNull();
  });

  it('returns the master VTODO when multiple with same UID (RRULE master + override)', () => {
    const ical = [
      'BEGIN:VCALENDAR',
      'BEGIN:VTODO',
      'UID:1',
      'SUMMARY:Master',
      'RRULE:FREQ=DAILY',
      'END:VTODO',
      'BEGIN:VTODO',
      'UID:1',
      'SUMMARY:Override',
      'RECURRENCE-ID:20251225T000000Z',
      'END:VTODO',
      'END:VCALENDAR',
    ].join('\r\n');

    const result = vtodoToTask(ical, 'a', 'c');

    expect(result?.title).toBe('Master');
  });
});

describe('Task ↔ VTODO round-trip via taskToVTodo + vtodoToTask', () => {
  it('preserves core fields through a full round-trip', () => {
    const original = makeTask({
      uid: 'roundtrip-uid',
      title: 'Buy milk',
      description: 'and eggs',
      priority: 'medium',
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
      parentUid: 'parent-1',
      sortOrder: 50000,
    });

    const ical = taskToVTodo(original);
    const restored = vtodoToTask(ical, 'roundtrip-account', 'roundtrip-cal');

    expect(restored?.uid).toBe(original.uid);
    expect(restored?.title).toBe(original.title);
    expect(restored?.description).toBe(original.description);
    expect(restored?.priority).toBe(original.priority);
    expect(restored?.rrule).toBe(original.rrule);
    expect(restored?.parentUid).toBe(original.parentUid);
    expect(restored?.sortOrder).toBe(original.sortOrder);
  });

  it('preserves special characters through round-trip', () => {
    const title = 'Tricky: a, b; c\nline2 \\backslash ✓';
    const original = makeTask({ title });

    const ical = taskToVTodo(original);
    const restored = vtodoToTask(ical, 'a', 'c');

    expect(restored?.title).toBe(title);
  });

  it('round-trips a completed task with completedAt', () => {
    const completedAt = new Date(Date.UTC(2025, 5, 15, 12, 0, 0));
    const original = makeTask({
      status: 'completed',
      completed: true,
      completedAt,
    });

    const ical = taskToVTodo(original);
    const restored = vtodoToTask(ical, 'a', 'c');

    expect(restored?.status).toBe('completed');
    expect(restored?.completed).toBe(true);
    expect(restored?.completedAt?.getTime()).toBe(completedAt.getTime());
  });
});

describe('taskToVTodo', () => {
  it('produces a complete VCALENDAR wrapper around the VTODO', () => {
    const task = makeTask({ uid: 'wrap-test' });

    const result = taskToVTodo(task);

    expect(result).toContain('BEGIN:VCALENDAR');
    expect(result).toContain('END:VCALENDAR');
    expect(result).toContain('BEGIN:VTODO');
    expect(result).toContain('END:VTODO');
    expect(result).toContain('UID:wrap-test');
  });

  it('matches generateVTodo + generateVCalendar (its constituent parts)', () => {
    const task = makeTask({ uid: 'parts-test', title: 'check' });

    expect(taskToVTodo(task)).toBe(generateVCalendar([generateVTodo(task)]));
  });
});
