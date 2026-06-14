import { describe, expect, it } from 'vitest';
import { generateUUID, pluralize } from '$utils/misc';

describe('generateUUID', () => {
  it('returns a string in RFC 4122 v4 format', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('returns unique values across many calls', () => {
    const set = new Set(Array.from({ length: 100 }, () => generateUUID()));
    expect(set.size).toBe(100);
  });
});

describe('pluralize', () => {
  it('returns the singular form for count of 1', () => {
    expect(pluralize(1, 'task')).toBe('task');
    expect(pluralize(1, 'octopus', 'octopi')).toBe('octopus');
  });

  it('returns "X + s" by default when count is not 1', () => {
    expect(pluralize(0, 'task')).toBe('tasks');
    expect(pluralize(2, 'task')).toBe('tasks');
    expect(pluralize(100, 'task')).toBe('tasks');
  });

  it('uses the explicit plural form when provided', () => {
    expect(pluralize(0, 'octopus', 'octopi')).toBe('octopi');
    expect(pluralize(5, 'goose', 'geese')).toBe('geese');
  });

  it('handles negative counts (treats as plural)', () => {
    expect(pluralize(-1, 'task')).toBe('tasks');
  });
});
