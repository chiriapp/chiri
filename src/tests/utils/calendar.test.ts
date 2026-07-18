import { addDays, startOfDay } from 'date-fns';
import { describe, expect, it } from 'vitest';
import {
  createPaddedDaysArray,
  getNextWorkingDay,
  getOrderedWorkingDays,
  isWorkingDay,
} from '$utils/calendar';

describe('createPaddedDaysArray', () => {
  it('pads month days to a stable six-row calendar grid', () => {
    const days = Array.from({ length: 30 }, (_, index) => new Date(2026, 5, index + 1));

    const paddedDays = createPaddedDaysArray(days, 0);

    expect(paddedDays).toHaveLength(42);
    expect(paddedDays.slice(0, 30)).toEqual(days);
    expect(paddedDays.slice(30)).toEqual(Array(12).fill(null));
  });

  it('keeps start padding before days and fills the remaining grid cells', () => {
    const days = Array.from({ length: 31 }, (_, index) => new Date(2026, 7, index + 1));

    const paddedDays = createPaddedDaysArray(days, 5);

    expect(paddedDays).toHaveLength(42);
    expect(paddedDays.slice(0, 5)).toEqual(Array(5).fill(null));
    expect(paddedDays.slice(5, 36)).toEqual(days);
    expect(paddedDays.slice(36)).toEqual(Array(6).fill(null));
  });
});

describe('isWorkingDay', () => {
  it('returns true for configured working days', () => {
    const monday = new Date(2026, 0, 5); // Monday
    expect(isWorkingDay(monday, ['mo', 'we', 'fr'])).toBe(true);
  });

  it('returns false for non-working days', () => {
    const tuesday = new Date(2026, 0, 6); // Tuesday
    expect(isWorkingDay(tuesday, ['mo', 'we', 'fr'])).toBe(false);
  });
});

describe('getNextWorkingDay', () => {
  it('skips a single weekend day', () => {
    const friday = startOfDay(new Date(2026, 0, 9)); // Friday
    const next = getNextWorkingDay(friday, ['mo', 'tu', 'we', 'th', 'fr']);
    expect(next).toEqual(startOfDay(addDays(friday, 3))); // Monday
  });

  it('skips a two-day weekend', () => {
    const saturday = startOfDay(new Date(2026, 0, 10)); // Saturday
    const next = getNextWorkingDay(saturday, ['mo', 'tu', 'we', 'th', 'fr']);
    expect(next).toEqual(startOfDay(addDays(saturday, 2))); // Monday
  });

  it('uses a custom working day schedule', () => {
    const monday = startOfDay(new Date(2026, 0, 5)); // Monday
    const next = getNextWorkingDay(monday, ['we', 'fr']);
    expect(next).toEqual(startOfDay(addDays(monday, 2))); // Wednesday
  });
});

describe('getOrderedWorkingDays', () => {
  it('orders days starting from monday by default', () => {
    expect(getOrderedWorkingDays('monday')).toEqual(['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su']);
  });

  it('orders days starting from sunday', () => {
    expect(getOrderedWorkingDays('sunday')).toEqual(['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa']);
  });

  it('orders days starting from saturday', () => {
    expect(getOrderedWorkingDays('saturday')).toEqual(['sa', 'su', 'mo', 'tu', 'we', 'th', 'fr']);
  });
});
