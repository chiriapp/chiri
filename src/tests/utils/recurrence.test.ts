import { describe, expect, it, vi } from 'vitest';

// recurrence imports formatDate from $utils/date, which depends on the
// settings store. mock formatDate to a deterministic ISO-ish format
vi.mock('$utils/date', () => ({
  formatDate: (date: Date, withYear: boolean) =>
    withYear
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      : `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
}));

import {
  buildRRule,
  classifyRRule,
  frequencyToRRule,
  getNextOccurrence,
  getNextOccurrences,
  getRepeatPresets,
  mergeRRuleParts,
  parseRRule,
  rruleToDisplaySummary,
  rruleToFrequency,
  rruleToText,
} from '$utils/recurrence';

describe('parseRRule', () => {
  it('parses a simple rrule', () => {
    expect(parseRRule('FREQ=DAILY')).toEqual({ FREQ: 'DAILY' });
  });

  it('parses multiple parts', () => {
    expect(parseRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR;INTERVAL=2')).toEqual({
      FREQ: 'WEEKLY',
      BYDAY: 'MO,WE,FR',
      INTERVAL: '2',
    });
  });

  it('uppercases keys (preserves value case)', () => {
    expect(parseRRule('freq=DAILY;byday=mo,we')).toEqual({ FREQ: 'DAILY', BYDAY: 'mo,we' });
  });

  it('ignores parts without "="', () => {
    expect(parseRRule('FREQ=DAILY;GARBAGE;COUNT=5')).toEqual({ FREQ: 'DAILY', COUNT: '5' });
  });

  it('returns empty object for empty input', () => {
    expect(parseRRule('')).toEqual({});
  });

  it('handles "=" inside values', () => {
    expect(parseRRule('UNTIL=20251225T000000Z')).toEqual({ UNTIL: '20251225T000000Z' });
  });
});

describe('buildRRule', () => {
  it('builds a simple FREQ-only rrule', () => {
    expect(buildRRule({ FREQ: 'DAILY' })).toBe('FREQ=DAILY');
  });

  it('places FREQ first', () => {
    expect(buildRRule({ INTERVAL: '2', FREQ: 'WEEKLY', BYDAY: 'MO' })).toBe(
      'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO',
    );
  });

  it('returns empty string when FREQ missing', () => {
    expect(buildRRule({ INTERVAL: '2' })).toBe('');
  });

  it('omits empty and undefined values', () => {
    // deliberately pass `undefined` even though the signature is Record<string, string>
    // we're testing that the implementation filters out missing values defensively
    expect(buildRRule({ FREQ: 'DAILY', BYDAY: '', COUNT: undefined as unknown as string })).toBe(
      'FREQ=DAILY',
    );
  });

  it('round-trips with parseRRule', () => {
    const input = 'FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=15';
    expect(buildRRule(parseRRule(input))).toBe(input);
  });
});

describe('mergeRRuleParts', () => {
  it('preserves fields the editor does not manage', () => {
    expect(
      mergeRRuleParts('FREQ=MONTHLY;BYMONTH=6;X-CHIRI=keep', ['FREQ', 'INTERVAL'], {
        FREQ: 'MONTHLY',
        INTERVAL: '2',
      }),
    ).toBe('FREQ=MONTHLY;BYMONTH=6;X-CHIRI=keep;INTERVAL=2');
  });

  it('removes managed fields when their update is empty', () => {
    expect(mergeRRuleParts('FREQ=DAILY;COUNT=5;X-FOO=bar', ['COUNT'], {})).toBe(
      'FREQ=DAILY;X-FOO=bar',
    );
  });
});

describe('classifyRRule', () => {
  it('separates editable, preserved, and invalid fields', () => {
    expect(
      classifyRRule('FREQ=MONTHLY;BYDAY=MO;BYSETPOS=1;BYMONTH=6;WKST=SU;X-FOO=bar'),
    ).toMatchObject({
      editableKeys: ['FREQ', 'BYDAY'],
      preservedKeys: ['BYSETPOS', 'BYMONTH', 'WKST'],
      invalidParts: ['X-FOO'],
    });
  });

  it('recognizes editable fields and rejects mutually exclusive endings', () => {
    expect(
      classifyRRule('FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=15;COUNT=3;UNTIL=20270101T000000Z'),
    ).toMatchObject({
      preservedKeys: [],
      invalidParts: ['COUNT+UNTIL'],
    });
  });

  it('reports malformed, duplicate, and unknown RRULE parts', () => {
    expect(classifyRRule('FREQ=DAILY;INTERVAL=2;INTERVAL=3;GARBAGE;X-APPLE-FOO=1')).toMatchObject({
      invalidParts: ['INTERVAL', 'GARBAGE', 'X-APPLE-FOO'],
    });
  });

  it('requires an editable frequency', () => {
    expect(classifyRRule('INTERVAL=2')).toMatchObject({ invalidParts: ['FREQ'] });
    expect(classifyRRule('FREQ=SECONDLY')).toMatchObject({
      invalidParts: ['FREQ=SECONDLY'],
    });
  });
});

describe('rruleToText', () => {
  it('formats simple daily', () => {
    expect(rruleToText('FREQ=DAILY')).toBe('Daily');
  });

  it('formats weekly with bydays', () => {
    expect(rruleToText('FREQ=WEEKLY;BYDAY=MO,WE,FR')).toBe('Weekly on Mon, Wed, Fri');
  });

  it('formats interval > 1', () => {
    expect(rruleToText('FREQ=DAILY;INTERVAL=3')).toBe('Every 3 days');
    expect(rruleToText('FREQ=WEEKLY;INTERVAL=2')).toBe('Every 2 weeks');
    expect(rruleToText('FREQ=MONTHLY;INTERVAL=6')).toBe('Every 6 months');
  });

  it('formats monthly with weekday-ordinal byday', () => {
    expect(rruleToText('FREQ=MONTHLY;BYDAY=1MO')).toContain('on the 1st Mon');
    expect(rruleToText('FREQ=MONTHLY;BYDAY=2TU')).toContain('on the 2nd Tue');
    expect(rruleToText('FREQ=MONTHLY;BYDAY=3WE')).toContain('on the 3rd Wed');
    expect(rruleToText('FREQ=MONTHLY;BYDAY=4TH')).toContain('on the 4th Thu');
    expect(rruleToText('FREQ=MONTHLY;BYDAY=-1FR')).toContain('on the last Fri');
  });

  it('formats monthly day-of-month rules', () => {
    expect(rruleToText('FREQ=MONTHLY;BYMONTHDAY=15')).toBe('Monthly on day 15');
    expect(rruleToDisplaySummary('FREQ=MONTHLY;BYMONTHDAY=15').details).toEqual(['day 15']);
  });

  it('appends count suffix correctly with singular/plural', () => {
    expect(rruleToText('FREQ=DAILY;COUNT=1')).toBe('Daily, 1 time');
    expect(rruleToText('FREQ=DAILY;COUNT=5')).toBe('Daily, 5 times');
  });

  it('appends until suffix', () => {
    expect(rruleToText('FREQ=DAILY;UNTIL=20251225T000000Z')).toBe('Daily until 2025-12-25');
  });

  it('appends repeatFrom suffix', () => {
    expect(rruleToText('FREQ=DAILY', 0)).toContain('from due date');
    expect(rruleToText('FREQ=DAILY', 1)).toContain('from completion');
  });
});

describe('rruleToDisplaySummary', () => {
  it('uses compact weekday wording', () => {
    expect(rruleToDisplaySummary('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')).toEqual({
      primary: 'Weekdays',
      short: 'Weekdays',
      details: [],
    });
  });

  it('moves secondary recurrence details out of the primary label', () => {
    expect(rruleToDisplaySummary('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;COUNT=5', 0)).toEqual({
      primary: 'Weekdays',
      short: 'Weekdays',
      details: ['5 times', 'from due date'],
    });
  });
});

describe('frequencyToRRule', () => {
  it('maps presets correctly', () => {
    expect(frequencyToRRule('daily')).toBe('FREQ=DAILY');
    expect(frequencyToRRule('weekdays')).toBe('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
    expect(frequencyToRRule('weekly')).toBe('FREQ=WEEKLY');
    expect(frequencyToRRule('monthly')).toBe('FREQ=MONTHLY');
    expect(frequencyToRRule('yearly')).toBe('FREQ=YEARLY');
  });

  it('uses due date day-of-week for weekly preset', () => {
    // Sunday in 2025: getDay() === 0 → SU
    expect(frequencyToRRule('weekly', new Date(2025, 0, 5))).toBe('FREQ=WEEKLY;BYDAY=SU');
    // Wednesday: getDay() === 3 → WE
    expect(frequencyToRRule('weekly', new Date(2025, 0, 8))).toBe('FREQ=WEEKLY;BYDAY=WE');
  });
});

describe('getRepeatPresets', () => {
  it('returns generic labels without a due date', () => {
    expect(getRepeatPresets().map(({ label }) => label)).toEqual([
      'Daily',
      'Weekdays',
      'Weekly',
      'Monthly',
      'Yearly',
    ]);
  });

  it('contextualizes calendar presets from the due date', () => {
    const presets = getRepeatPresets(new Date(2025, 0, 22));

    expect(presets.map(({ label }) => label)).toEqual([
      'Daily',
      'Weekdays',
      'Weekly on Wednesday',
      'Monthly on the 22nd',
      'Yearly on January 22',
    ]);
    expect(presets.find(({ id }) => id === 'weekly')?.rrule).toBe('FREQ=WEEKLY;BYDAY=WE');
  });

  it('formats teen ordinals correctly', () => {
    expect(getRepeatPresets(new Date(2025, 0, 11))[3].label).toBe('Monthly on the 11th');
    expect(getRepeatPresets(new Date(2025, 0, 13))[3].label).toBe('Monthly on the 13th');
  });
});

describe('rruleToFrequency', () => {
  it('detects daily preset', () => {
    expect(rruleToFrequency('FREQ=DAILY')).toBe('daily');
  });

  it('detects weekdays preset (partial weekdays too)', () => {
    expect(rruleToFrequency('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')).toBe('weekdays');
    expect(rruleToFrequency('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH')).toBe('weekdays');
    expect(rruleToFrequency('FREQ=WEEKLY;BYDAY=FR')).toBe('weekdays');
  });

  it('detects weekly preset (no byday)', () => {
    expect(rruleToFrequency('FREQ=WEEKLY')).toBe('weekly');
  });

  it('detects weekly preset (single byday)', () => {
    expect(rruleToFrequency('FREQ=WEEKLY;BYDAY=SA')).toBe('weekly');
  });

  it('falls back to custom for multi-byday non-weekdays patterns', () => {
    expect(rruleToFrequency('FREQ=WEEKLY;BYDAY=MO,SA')).toBe('custom');
  });

  it('detects monthly preset only without byday', () => {
    expect(rruleToFrequency('FREQ=MONTHLY')).toBe('monthly');
    expect(rruleToFrequency('FREQ=MONTHLY;BYDAY=1MO')).toBe('custom');
  });

  it('detects yearly preset', () => {
    expect(rruleToFrequency('FREQ=YEARLY')).toBe('yearly');
  });

  it('marks INTERVAL != 1 as custom', () => {
    expect(rruleToFrequency('FREQ=DAILY;INTERVAL=2')).toBe('custom');
  });

  it('marks UNTIL/COUNT/BYMONTHDAY/BYMONTH/BYSETPOS as custom', () => {
    expect(rruleToFrequency('FREQ=DAILY;COUNT=5')).toBe('custom');
    expect(rruleToFrequency('FREQ=DAILY;UNTIL=20251225T000000Z')).toBe('custom');
    expect(rruleToFrequency('FREQ=MONTHLY;BYMONTHDAY=15')).toBe('custom');
    expect(rruleToFrequency('FREQ=YEARLY;BYMONTH=12')).toBe('custom');
  });
});

describe('getNextOccurrence', () => {
  it('returns the next occurrence strictly after the reference date', () => {
    const dtstart = new Date(Date.UTC(2025, 0, 1));
    const after = new Date(Date.UTC(2025, 0, 1, 12));
    const result = getNextOccurrence('FREQ=DAILY', after, dtstart);
    // strictly after = next day at the dtstart time
    expect(result?.getTime()).toBeGreaterThan(after.getTime());
  });

  it('returns null for malformed rrule', () => {
    const result = getNextOccurrence('garbage', new Date());
    expect(result).toBeNull();
  });

  it('returns null when COUNT is exhausted', () => {
    const dtstart = new Date(Date.UTC(2025, 0, 1));
    // 5 daily occurrences from Jan 1 → Jan 5. after Jan 6 there are none
    const after = new Date(Date.UTC(2025, 0, 6));
    const result = getNextOccurrence('FREQ=DAILY;COUNT=5', after, dtstart);
    expect(result).toBeNull();
  });

  it('returns null when UNTIL has passed', () => {
    const dtstart = new Date(Date.UTC(2025, 0, 1));
    const after = new Date(Date.UTC(2025, 1, 1));
    const result = getNextOccurrence('FREQ=DAILY;UNTIL=20250110T000000Z', after, dtstart);
    expect(result).toBeNull();
  });
});

describe('getNextOccurrences', () => {
  it('returns a bounded occurrence preview', () => {
    const start = new Date(Date.UTC(2025, 0, 1));
    expect(
      getNextOccurrences('FREQ=DAILY', start, start, 3).map((date) => date.getUTCDate()),
    ).toEqual([2, 3, 4]);
  });

  it('respects finite rules', () => {
    const start = new Date(Date.UTC(2025, 0, 1));
    expect(getNextOccurrences('FREQ=DAILY;COUNT=2', start, start, 3)).toHaveLength(1);
  });
});
