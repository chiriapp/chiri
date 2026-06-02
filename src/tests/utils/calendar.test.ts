import { describe, expect, it } from 'vitest';
import { createPaddedDaysArray } from '$utils/calendar';

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
