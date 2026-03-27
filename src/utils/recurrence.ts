/**
 * Recurrence utilities wrapping rrule-temporal for RFC 5545 RRULE support.
 *
 * We store only the RRULE value string (e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR"),
 * not the full "RRULE:..." line. DTSTART is derived from the task's due/start date.
 */

import { RRuleTemporal } from 'rrule-temporal';

/** Format a JS Date as a UTC iCal datetime string (YYYYMMDDTHHMMSSZ). */
const toICalUTC = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
};

/** Build a complete rrule string (DTSTART + RRULE) for rrule-temporal. */
const buildRuleString = (rruleValue: string, dtstart: Date) => {
  return `DTSTART:${toICalUTC(dtstart)}\nRRULE:${rruleValue}`;
};

/**
 * Get the next occurrence of a recurrence rule strictly after `after`.
 *
 * @param rruleValue  Raw RRULE value, e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR"
 * @param after       The reference date — result will be strictly later than this
 * @param dtstart     Optional explicit series start; defaults to `after`
 */
export const getNextOccurrence = (rruleValue: string, after: Date, dtstart?: Date): Date | null => {
  try {
    const rule = new RRuleTemporal({
      rruleString: buildRuleString(rruleValue, dtstart ?? after),
    });

    const afterMs = after.getTime();
    let result: Date | null = null;

    // all(iterator) stops iteration when the iterator returns false.
    // Each `occ` is a Temporal.ZonedDateTime from rrule-temporal.
    rule.all((occ: { epochMilliseconds: number }) => {
      if (occ.epochMilliseconds > afterMs) {
        result = new Date(occ.epochMilliseconds);
        return false; // stop
      }
      return true; // continue
    });

    return result;
  } catch {
    return null;
  }
};

/**
 * Returns true if the rrule has no more future occurrences after `after`
 * (i.e. COUNT was exhausted or UNTIL has passed).
 */
export const hasMoreOccurrences = (rruleValue: string, after: Date, dtstart?: Date) => {
  return getNextOccurrence(rruleValue, after, dtstart) !== null;
};

const FREQ_LABEL: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly',
  HOURLY: 'Hourly',
  MINUTELY: 'Every minute',
  SECONDLY: 'Every second',
};

const BYDAY_LABEL: Record<string, string> = {
  MO: 'Mon',
  TU: 'Tue',
  WE: 'Wed',
  TH: 'Thu',
  FR: 'Fri',
  SA: 'Sat',
  SU: 'Sun',
};

/**
 * Parse a raw RRULE value string into a key→value map.
 * e.g. "FREQ=WEEKLY;BYDAY=MO,WE;INTERVAL=2" → { FREQ: "WEEKLY", BYDAY: "MO,WE", INTERVAL: "2" }
 */
export const parseRRule = (rruleValue: string) => {
  const result: Record<string, string> = {};
  for (const part of rruleValue.split(';')) {
    const eq = part.indexOf('=');
    if (eq !== -1) {
      result[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1);
    }
  }
  return result;
};

/**
 * Build an RRULE value string from a key→value map.
 * FREQ is always placed first as required by RFC 5545.
 */
export const buildRRule = (parts: Record<string, string>) => {
  const { FREQ, ...rest } = parts;
  if (!FREQ) return '';
  const extras = Object.entries(rest)
    .filter(([, v]) => v !== '' && v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join(';');
  return extras ? `FREQ=${FREQ};${extras}` : `FREQ=${FREQ}`;
};

/**
 * Return a short human-readable summary of a RRULE value string.
 * e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR" → "Weekly on Mon, Wed, Fri"
 */
export const rruleToText = (rruleValue: string) => {
  try {
    const parts = parseRRule(rruleValue);
    const freq = parts.FREQ ?? '';
    const interval = parseInt(parts.INTERVAL ?? '1', 10);
    const count = parts.COUNT ? parseInt(parts.COUNT, 10) : undefined;
    const until = parts.UNTIL;
    const byday = parts.BYDAY;

    // Base frequency label
    let label: string;
    if (interval > 1) {
      const unit =
        freq === 'DAILY'
          ? 'days'
          : freq === 'WEEKLY'
            ? 'weeks'
            : freq === 'MONTHLY'
              ? 'months'
              : freq === 'YEARLY'
                ? 'years'
                : freq === 'HOURLY'
                  ? 'hours'
                  : freq === 'MINUTELY'
                    ? 'minutes'
                    : freq === 'SECONDLY'
                      ? 'seconds'
                      : freq.toLowerCase();
      label = `Every ${interval} ${unit}`;
    } else {
      label = FREQ_LABEL[freq] ?? freq;
    }

    // Day list for weekly
    if (freq === 'WEEKLY' && byday) {
      const days = byday
        .split(',')
        .map((d) => BYDAY_LABEL[d.replace(/^[+-]?\d+/, '')] ?? d)
        .join(', ');
      label += ` on ${days}`;
    }

    // Monthly with specific weekday (e.g. 1MO = first Monday)
    if (freq === 'MONTHLY' && byday) {
      const match = byday.match(/^([+-]?\d+)([A-Z]+)$/);
      if (match) {
        const [, offset, day] = match;
        const n = parseInt(offset, 10);
        const ordinal =
          n === -1 ? 'last' : n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
        label += ` on the ${ordinal} ${BYDAY_LABEL[day] ?? day}`;
      }
    }

    // End condition suffix
    if (count !== undefined) {
      label += `, ${count} ${count === 1 ? 'time' : 'times'}`;
    } else if (until) {
      // UNTIL format: YYYYMMDD or YYYYMMDDTHHMMSSZ
      const y = until.slice(0, 4);
      const m = until.slice(4, 6);
      const d = until.slice(6, 8);
      label += ` until ${y}-${m}-${d}`;
    }

    return label;
  } catch {
    return rruleValue;
  }
};

export type RecurrenceFrequency =
  | 'none'
  | 'daily'
  | 'weekdays'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom';

/** Build a simple RRULE value from a preset frequency + optional due date day-of-week. */
export const frequencyToRRule = (
  freq: Exclude<RecurrenceFrequency, 'none' | 'custom'>,
  dueDateForMonthly?: Date,
) => {
  switch (freq) {
    case 'daily':
      return 'FREQ=DAILY';
    case 'weekdays':
      return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
    case 'weekly': {
      // Default to the day of the week of the due date
      if (dueDateForMonthly) {
        const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        return `FREQ=WEEKLY;BYDAY=${days[dueDateForMonthly.getDay()]}`;
      }
      return 'FREQ=WEEKLY';
    }
    case 'monthly':
      return 'FREQ=MONTHLY';
    case 'yearly':
      return 'FREQ=YEARLY';
  }
};

/** Infer a preset frequency label from a RRULE value string, or "custom" if it doesn't match a preset. */
export const rruleToFrequency = (rruleValue: string): RecurrenceFrequency => {
  const parts = parseRRule(rruleValue);
  const freq = parts.FREQ;
  const byday = parts.BYDAY ?? '';
  const interval = parts.INTERVAL ?? '1';

  if (interval !== '1') return 'custom';
  if (parts.COUNT || parts.UNTIL || parts.BYMONTHDAY || parts.BYMONTH || parts.BYSETPOS)
    return 'custom';

  if (freq === 'DAILY') return 'daily';
  if (freq === 'WEEKLY') {
    if (byday === 'MO,TU,WE,TH,FR') return 'weekdays';
    // Single-day weekly with no extras = weekly preset
    if (!byday || byday.split(',').length === 1) return 'weekly';
    return 'custom';
  }
  if (freq === 'MONTHLY' && !byday) return 'monthly';
  if (freq === 'YEARLY') return 'yearly';
  return 'custom';
};
