import { describe, expect, it, vi } from 'vitest';

// cut transitive chain at store/tags. logger mocks come from setup.ts
vi.mock('$lib/store/tags', () => ({ getAllTags: () => [] }));
vi.mock('$utils/misc', () => ({ generateUUID: () => 'fixed-test-uuid' }));

import { generateVCalendar, generateVTodo, parseVTodo } from '$lib/ical/vtodo';
import type { Task } from '$types';

const baseTask = {
  id: 'task-1',
  uid: 'uid-1',
  title: 'Buy milk',
  status: 'needs-action',
  priority: 'none',
  sortOrder: 100,
  createdAt: Date.UTC(2025, 0, 1),
  modifiedAt: Date.UTC(2025, 0, 1),
  tags: [],
  reminders: [],
} as unknown as Task;

describe('generateVTodo', () => {
  it('produces wrapped VTODO content', () => {
    const result = generateVTodo(baseTask);
    expect(result.startsWith('BEGIN:VTODO')).toBe(true);
    expect(result.endsWith('END:VTODO')).toBe(true);
  });

  it('includes UID and SUMMARY', () => {
    const result = generateVTodo(baseTask);
    expect(result).toContain('UID:uid-1');
    expect(result).toContain('SUMMARY:Buy milk');
  });

  it('escapes special characters in SUMMARY', () => {
    const result = generateVTodo({ ...baseTask, title: 'a, b; c\nd\\e' });
    expect(result).toContain('SUMMARY:a\\, b\\; c\\nd\\\\e');
  });

  it('emits PRIORITY:1 for high', () => {
    expect(generateVTodo({ ...baseTask, priority: 'high' })).toContain('PRIORITY:1');
  });

  it('emits PRIORITY:5 for medium', () => {
    expect(generateVTodo({ ...baseTask, priority: 'medium' })).toContain('PRIORITY:5');
  });

  it('emits PRIORITY:9 for low', () => {
    expect(generateVTodo({ ...baseTask, priority: 'low' })).toContain('PRIORITY:9');
  });

  it('emits PRIORITY:0 for none', () => {
    expect(generateVTodo({ ...baseTask, priority: 'none' })).toContain('PRIORITY:0');
  });

  it('omits DESCRIPTION when empty/missing', () => {
    expect(generateVTodo(baseTask)).not.toMatch(/DESCRIPTION:/);
  });

  it('includes DESCRIPTION when set', () => {
    expect(generateVTodo({ ...baseTask, description: 'notes' })).toContain('DESCRIPTION:notes');
  });

  it('emits STATUS:COMPLETED + COMPLETED line when completed', () => {
    const t = { ...baseTask, status: 'completed', completedAt: Date.UTC(2025, 5, 1, 12) };
    const result = generateVTodo(t);
    expect(result).toContain('STATUS:COMPLETED');
    expect(result).toMatch(/COMPLETED:\d{8}T\d{6}Z/);
  });

  it('emits RELATED-TO with RELTYPE=PARENT for child tasks', () => {
    expect(generateVTodo({ ...baseTask, parentUid: 'p-uid' })).toContain(
      'RELATED-TO;RELTYPE=PARENT:p-uid',
    );
  });

  it('emits RRULE when set', () => {
    expect(generateVTodo({ ...baseTask, rrule: 'FREQ=DAILY' })).toContain('RRULE:FREQ=DAILY');
  });

  it('emits X-APPLE-SORT-ORDER', () => {
    expect(generateVTodo({ ...baseTask, sortOrder: 12345 })).toContain('X-APPLE-SORT-ORDER:12345');
  });

  it('escapes URL', () => {
    expect(generateVTodo({ ...baseTask, url: 'https://x.com/a,b' })).toContain(
      'URL:https://x.com/a\\,b',
    );
  });

  it('folds lines longer than 75 octets', () => {
    const longTitle = 'x'.repeat(200);
    const result = generateVTodo({ ...baseTask, title: longTitle });
    // CRLF + space marks a folded continuation
    expect(result).toMatch(/\r\n /);
  });

  it('roundtrips simple core fields through parseVTodo', () => {
    const out = generateVTodo({
      ...baseTask,
      title: 'task',
      description: 'desc',
      priority: 'medium',
    });
    const parsed = parseVTodo(out);
    expect(parsed.uid).toBe('uid-1');
    expect(parsed.summary).toBe('task');
    expect(parsed.description).toBe('desc');
    expect(parsed.priority).toBe(5);
  });

  it('roundtrips special characters', () => {
    const title = 'a; b, c\nd\\e ✓';
    const out = generateVTodo({ ...baseTask, title });
    const parsed = parseVTodo(out);
    expect(parsed.summary).toBe(title);
  });
});

describe('generateVCalendar', () => {
  it('wraps VTODOs in a VCALENDAR envelope', () => {
    const v = generateVTodo(baseTask);
    const cal = generateVCalendar([v]);
    expect(cal).toContain('BEGIN:VCALENDAR');
    expect(cal).toContain('END:VCALENDAR');
    expect(cal).toContain('VERSION:2.0');
    expect(cal).toContain('BEGIN:VTODO');
  });

  it('handles an empty vtodo list', () => {
    const cal = generateVCalendar([]);
    expect(cal).toContain('BEGIN:VCALENDAR');
    expect(cal).toContain('END:VCALENDAR');
  });
});
