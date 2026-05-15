import { describe, expect, it, vi } from 'vitest';

// vtodo.ts transitively pulls in the store/settings → DOM theming chain.
// Cut the chain at $lib/store/tags so the module evaluates in plain Node.
// (Logger mocks come from src/tests/setup.ts.)
vi.mock('$lib/store/tags', () => ({ getAllTags: () => [] }));
vi.mock('$utils/misc', () => ({ generateUUID: () => 'test-uuid' }));

import {
  APPLE_EPOCH,
  filterCalDavDescription,
  fromAppleEpoch,
  isDefaultCalDavDescription,
  toAppleEpoch,
} from '$lib/ical/vtodo';

describe('APPLE_EPOCH', () => {
  it('equals Jan 1 2001 UTC in milliseconds', () => {
    expect(APPLE_EPOCH).toBe(Date.UTC(2001, 0, 1));
  });
});

describe('toAppleEpoch / fromAppleEpoch', () => {
  it('Apple epoch itself maps to 0', () => {
    expect(toAppleEpoch(APPLE_EPOCH)).toBe(0);
    expect(fromAppleEpoch(0)).toBe(APPLE_EPOCH);
  });

  it('Unix epoch maps to a negative Apple-epoch value', () => {
    expect(toAppleEpoch(0)).toBe(-978307200);
  });

  it('round-trips arbitrary timestamps (truncated to seconds)', () => {
    const now = Date.UTC(2025, 5, 15, 12, 30, 45);
    const round = fromAppleEpoch(toAppleEpoch(now));
    expect(round).toBe(now);
  });

  it('truncates sub-second precision via Math.floor', () => {
    // ms→seconds floor, then back: the millis component should be lost
    const t = APPLE_EPOCH + 999; // 999ms after Apple epoch
    expect(toAppleEpoch(t)).toBe(0);
    expect(fromAppleEpoch(toAppleEpoch(t))).toBe(APPLE_EPOCH);
  });

  it('handles times far in the future', () => {
    const t = Date.UTC(2100, 0, 1);
    expect(fromAppleEpoch(toAppleEpoch(t))).toBe(t);
  });

  it('handles times before Apple epoch (Unix only)', () => {
    const t = Date.UTC(1970, 0, 1, 0, 0, 0);
    expect(toAppleEpoch(t)).toBeLessThan(0);
    expect(fromAppleEpoch(toAppleEpoch(t))).toBe(t);
  });
});

describe('isDefaultCalDavDescription', () => {
  it('returns true for the Chiri default', () => {
    expect(isDefaultCalDavDescription('Default Chiri description')).toBe(true);
  });

  it('returns true for Tasks.org default', () => {
    expect(isDefaultCalDavDescription('Default Tasks.org description')).toBe(true);
  });

  it('returns true for Thunderbird default', () => {
    expect(isDefaultCalDavDescription('Default Mozilla Description')).toBe(true);
  });

  it('returns true for Fruux default', () => {
    expect(isDefaultCalDavDescription('Event reminder')).toBe(true);
  });

  it('trims whitespace before comparing', () => {
    expect(isDefaultCalDavDescription('  Default Chiri description  ')).toBe(true);
    expect(isDefaultCalDavDescription('\nEvent reminder\t')).toBe(true);
  });

  it('returns false for real descriptions', () => {
    expect(isDefaultCalDavDescription('Buy milk')).toBe(false);
    expect(isDefaultCalDavDescription('Default Chiri description extended')).toBe(false);
  });

  it('returns false for null/undefined/empty', () => {
    expect(isDefaultCalDavDescription(null)).toBe(false);
    expect(isDefaultCalDavDescription(undefined)).toBe(false);
    expect(isDefaultCalDavDescription('')).toBe(false);
  });

  it('is case-sensitive', () => {
    // Documents current behavior — these are not treated as defaults.
    expect(isDefaultCalDavDescription('default chiri description')).toBe(false);
    expect(isDefaultCalDavDescription('EVENT REMINDER')).toBe(false);
  });
});

describe('filterCalDavDescription', () => {
  it('returns empty string for defaults', () => {
    expect(filterCalDavDescription('Default Chiri description')).toBe('');
    expect(filterCalDavDescription('Event reminder')).toBe('');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(filterCalDavDescription(null)).toBe('');
    expect(filterCalDavDescription(undefined)).toBe('');
    expect(filterCalDavDescription('')).toBe('');
  });

  it('preserves real descriptions', () => {
    expect(filterCalDavDescription('Buy milk')).toBe('Buy milk');
  });

  it('does not trim non-default real descriptions', () => {
    expect(filterCalDavDescription('  Buy milk  ')).toBe('  Buy milk  ');
  });
});
