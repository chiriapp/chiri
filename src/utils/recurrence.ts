/**
 * recurrence utilities wrapping rrule-temporal for RFC 5545 RRULE support
 *
 * we store only the RRULE value string (e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR"),
 * not the full "RRULE:..." line. DTSTART is derived from the task's due/start date
 */

import { format } from 'date-fns';
import { RRuleTemporal } from 'rrule-temporal';
import type { DateFormat, WorkingDay } from '$types/preference';
import type { RecurrenceFrequency } from '$types/recurrence';
import { formatDate } from '$utils/date';

const WORKING_DAY_TO_RRULE: Record<WorkingDay, string> = {
  su: 'SU',
  mo: 'MO',
  tu: 'TU',
  we: 'WE',
  th: 'TH',
  fr: 'FR',
  sa: 'SA',
};

const DEFAULT_WORKING_DAYS: WorkingDay[] = ['mo', 'tu', 'we', 'th', 'fr'];

/** format a JS Date as a UTC iCal datetime string (YYYYMMDDTHHMMSSZ) */
const toICalUTC = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
};

/** build a complete rrule string (DTSTART + RRULE) for rrule-temporal */
const buildRuleString = (rruleValue: string, dtstart: Date) => {
  return `DTSTART:${toICalUTC(dtstart)}\nRRULE:${rruleValue}`;
};

/**
 * get the next occurrence of a recurrence rule strictly after `after`
 *
 * @param rruleValue  Raw RRULE value, e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR"
 * @param after       The reference date - result will be strictly later than this
 * @param dtstart     Optional explicit series start; defaults to `after`
 */
export const getNextOccurrence = (rruleValue: string, after: Date, dtstart?: Date): Date | null => {
  try {
    const rule = new RRuleTemporal({
      rruleString: buildRuleString(rruleValue, dtstart ?? after),
    });

    const afterMs = after.getTime();
    let result: Date | null = null;

    // all(iterator) stops iteration when the iterator returns false
    // each `occ` is a Temporal.ZonedDateTime from rrule-temporal
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

/** get up to `limit` occurrences strictly after a reference date */
export const getNextOccurrences = (
  rruleValue: string,
  after: Date,
  dtstart: Date | undefined,
  limit = 3,
): Date[] => {
  if (limit <= 0) return [];
  const results: Date[] = [];
  let cursor = after;

  for (let index = 0; index < limit; index += 1) {
    const next = getNextOccurrence(rruleValue, cursor, dtstart);
    if (!next) break;
    results.push(next);
    cursor = next;
  }

  return results;
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

const FREQ_UNIT: Record<string, string> = {
  DAILY: 'days',
  WEEKLY: 'weeks',
  MONTHLY: 'months',
  YEARLY: 'years',
  HOURLY: 'hours',
  MINUTELY: 'minutes',
  SECONDLY: 'seconds',
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
 * parse a raw RRULE value string into a key→value map
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

const VISUALLY_EDITABLE_RRULE_KEYS = new Set([
  'FREQ',
  'INTERVAL',
  'BYDAY',
  'BYMONTHDAY',
  'COUNT',
  'UNTIL',
]);

const PRESERVED_RRULE_KEYS = new Set([
  'BYSETPOS',
  'BYMONTH',
  'BYYEARDAY',
  'BYWEEKNO',
  'BYHOUR',
  'BYMINUTE',
  'BYSECOND',
  'WKST',
]);

const VISUALLY_EDITABLE_FREQUENCIES = new Set([
  'MINUTELY',
  'HOURLY',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
]);

export interface RRuleCapability {
  editableKeys: string[];
  preservedKeys: string[];
  invalidParts: string[];
  issues: string[];
}

/**
 * classify an RRULE by what the visual editor owns, what it can round-trip opaquely,
 * and what cannot be safely interpreted. X-* properties belong to the surrounding
 * iCalendar component; an X-* token inside RRULE is therefore invalid here
 */
export const classifyRRule = (rruleValue: string | undefined): RRuleCapability => {
  const result: RRuleCapability = {
    editableKeys: [],
    preservedKeys: [],
    invalidParts: [],
    issues: [],
  };
  if (!rruleValue) return result;

  const seen = new Set<string>();
  const values: Record<string, string> = {};
  for (const rawPart of rruleValue.split(';')) {
    const eq = rawPart.indexOf('=');
    if (eq <= 0 || eq === rawPart.length - 1) {
      result.invalidParts.push(rawPart || '(empty)');
      result.issues.push(`Malformed RRULE part: ${rawPart || '(empty)'}`);
      continue;
    }

    const key = rawPart.slice(0, eq).toUpperCase();
    const value = rawPart.slice(eq + 1);
    if (seen.has(key)) {
      result.invalidParts.push(key);
      result.issues.push(`Duplicate RRULE field: ${key}`);
      continue;
    }
    seen.add(key);
    values[key] = value;

    if (VISUALLY_EDITABLE_RRULE_KEYS.has(key)) {
      result.editableKeys.push(key);
    } else if (PRESERVED_RRULE_KEYS.has(key)) {
      result.preservedKeys.push(key);
    } else {
      result.invalidParts.push(key);
      result.issues.push(`Unknown RRULE field: ${key}`);
    }
  }

  if (!values.FREQ) {
    result.invalidParts.push('FREQ');
    result.issues.push('RRULE is missing FREQ');
  } else if (!VISUALLY_EDITABLE_FREQUENCIES.has(values.FREQ.toUpperCase())) {
    result.invalidParts.push(`FREQ=${values.FREQ}`);
    result.issues.push(`Frequency cannot be edited visually: ${values.FREQ}`);
  }
  if (values.COUNT && values.UNTIL) {
    result.invalidParts.push('COUNT+UNTIL');
    result.issues.push('COUNT and UNTIL cannot be used together');
  }

  return result;
};

/**
 * build an RRULE value string from a key→value map
 * FREQ is always placed first as required by RFC 5545
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
 * apply editor-owned RRULE fields without discarding fields imported from CalDAV
 * that the editor does not understand
 */
export const mergeRRuleParts = (
  originalRrule: string | undefined,
  managedKeys: readonly string[],
  updates: Record<string, string | undefined>,
) => {
  const parts: Record<string, string> = originalRrule ? parseRRule(originalRrule) : {};
  for (const key of managedKeys) delete parts[key.toUpperCase()];
  for (const [key, value] of Object.entries(updates)) {
    if (value) parts[key.toUpperCase()] = value;
  }
  return buildRRule(parts);
};

/**
 * get frequency label for interval > 1 (e.g., "Every 2 weeks")
 */
const getIntervalLabel = (freq: string, interval: number) => {
  const unit = FREQ_UNIT[freq] ?? freq.toLowerCase();
  return `Every ${interval} ${unit}`;
};

/**
 * format BYDAY list for weekly recurrence (e.g., "Mon, Wed, Fri")
 */
const formatWeeklyDays = (byday: string) => {
  return byday
    .split(',')
    .map((d) => BYDAY_LABEL[d.replace(/^[+-]?\d+/, '')] ?? d)
    .join(', ');
};

/**
 * format monthly BYDAY (e.g., "1MO" → "on the 1st Mon")
 */
const formatMonthlyByday = (byday: string) => {
  const match = byday.match(/^([+-]?\d+)([A-Z]+)$/);
  if (!match) return null;

  const n = parseInt(match[1], 10);
  const day = match[2];
  const ordinal =
    n === -1 ? 'last' : n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
  return ` on the ${ordinal} ${BYDAY_LABEL[day] ?? day}`;
};

const formatMonthlyBydayDetail = (byday: string) => {
  const monthlyByday = formatMonthlyByday(byday);
  return monthlyByday ? monthlyByday.replace(/^ on the /, '') : null;
};

/**
 * format the UNTIL date (e.g., "until Jan 1, 2024")
 */
const formatUntilDate = (until: string, dateFormat?: DateFormat) => {
  const y = parseInt(until.slice(0, 4), 10);
  const m = parseInt(until.slice(4, 6), 10) - 1;
  const d = parseInt(until.slice(6, 8), 10);
  return formatDate(new Date(y, m, d), true, dateFormat);
};

export interface RRuleDisplaySummary {
  primary: string;
  short: string;
  details: string[];
}

const WEEKDAYS = 'MO,TU,WE,TH,FR';

export interface RepeatPreset {
  id: 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';
  label: string;
  rrule: string;
}

const getOrdinal = (day: number) => {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;

  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
};

/** common repeat choices, contextualized by the task's current due date */
export const getRepeatPresets = (
  dueDate?: Date,
  workingDays: WorkingDay[] = DEFAULT_WORKING_DAYS,
): RepeatPreset[] => [
  { id: 'daily', label: 'Daily', rrule: frequencyToRRule('daily') },
  {
    id: 'weekdays',
    label: 'Weekdays',
    rrule: frequencyToRRule('weekdays', undefined, workingDays),
  },
  {
    id: 'weekly',
    label: dueDate ? `Weekly on ${format(dueDate, 'EEEE')}` : 'Weekly',
    rrule: frequencyToRRule('weekly', dueDate),
  },
  {
    id: 'monthly',
    label: dueDate ? `Monthly on the ${getOrdinal(dueDate.getDate())}` : 'Monthly',
    rrule: frequencyToRRule('monthly'),
  },
  {
    id: 'yearly',
    label: dueDate ? `Yearly on ${format(dueDate, 'MMMM d')}` : 'Yearly',
    rrule: frequencyToRRule('yearly'),
  },
];

export const rruleToDisplaySummary = (
  rruleValue: string,
  repeatFrom?: number,
  dateFormat?: DateFormat,
): RRuleDisplaySummary => {
  try {
    const parts = parseRRule(rruleValue);
    const freq = parts.FREQ ?? '';
    const interval = parseInt(parts.INTERVAL ?? '1', 10);
    const count = parts.COUNT ? parseInt(parts.COUNT, 10) : undefined;
    const byday = parts.BYDAY;
    const details: string[] = [];

    let primary = interval > 1 ? getIntervalLabel(freq, interval) : (FREQ_LABEL[freq] ?? freq);

    if (freq === 'WEEKLY' && byday) {
      if (byday === WEEKDAYS) {
        primary = 'Weekdays';
      } else {
        details.push(formatWeeklyDays(byday));
      }
    }

    if (freq === 'MONTHLY' && byday) {
      const monthlyByday = formatMonthlyBydayDetail(byday);
      if (monthlyByday) details.push(monthlyByday);
    } else if (freq === 'MONTHLY' && parts.BYMONTHDAY) {
      details.push(`day ${parts.BYMONTHDAY}`);
    }

    if (count !== undefined) {
      details.push(`${count} ${count === 1 ? 'time' : 'times'}`);
    } else if (parts.UNTIL) {
      details.push(`until ${formatUntilDate(parts.UNTIL, dateFormat)}`);
    }

    if (repeatFrom === 1) {
      details.push('from completion');
    } else if (repeatFrom === 0) {
      details.push('from due date');
    }

    return {
      primary,
      short: primary,
      details,
    };
  } catch {
    return {
      primary: rruleValue,
      short: rruleValue,
      details: [],
    };
  }
};

/**
 * return a short human-readable summary of a RRULE value string
 * e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR" → "Weekly on Mon, Wed, Fri"
 *
 * @param repeatFrom  0 = advance from due date (default), 1 = advance from completion date
 * @param dateFormat  User's preferred date format for the UNTIL date display
 */
export const rruleToText = (rruleValue: string, repeatFrom?: number, dateFormat?: DateFormat) => {
  try {
    const parts = parseRRule(rruleValue);
    const freq = parts.FREQ ?? '';
    const interval = parseInt(parts.INTERVAL ?? '1', 10);
    const count = parts.COUNT ? parseInt(parts.COUNT, 10) : undefined;
    const byday = parts.BYDAY;

    // base frequency label
    let label = interval > 1 ? getIntervalLabel(freq, interval) : (FREQ_LABEL[freq] ?? freq);

    // day list for weekly
    if (freq === 'WEEKLY' && byday) {
      label += ` on ${formatWeeklyDays(byday)}`;
    }

    // monthly with specific weekday (e.g. 1MO = first Monday)
    if (freq === 'MONTHLY' && byday) {
      const monthlyByday = formatMonthlyByday(byday);
      if (monthlyByday) label += monthlyByday;
    } else if (freq === 'MONTHLY' && parts.BYMONTHDAY) {
      label += ` on day ${parts.BYMONTHDAY}`;
    }

    // end condition suffix
    if (count !== undefined) {
      label += `, ${count} ${count === 1 ? 'time' : 'times'}`;
    } else if (parts.UNTIL) {
      label += ` until ${formatUntilDate(parts.UNTIL, dateFormat)}`;
    }

    // repeat from suffix
    if (repeatFrom === 1) {
      label += ' · from completion';
    } else if (repeatFrom === 0) {
      label += ' · from due date';
    }

    return label;
  } catch {
    return rruleValue;
  }
};

/** build a simple RRULE value from a preset frequency + optional due date day-of-week */
export const frequencyToRRule = (
  freq: Exclude<RecurrenceFrequency, 'none' | 'custom'>,
  dueDateForMonthly?: Date,
  workingDays: WorkingDay[] = DEFAULT_WORKING_DAYS,
) => {
  switch (freq) {
    case 'daily':
      return 'FREQ=DAILY';
    case 'weekdays': {
      const byday = workingDays.map((d) => WORKING_DAY_TO_RRULE[d]).join(',');
      return byday ? `FREQ=WEEKLY;BYDAY=${byday}` : 'FREQ=WEEKLY';
    }
    case 'weekly': {
      // default to the day of the week of the due date
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

/** infer a preset frequency label from a RRULE value string, or "custom" if it doesn't match a preset */
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
    const days = byday.split(',').filter(Boolean);
    const weekdayDays = ['MO', 'TU', 'WE', 'TH', 'FR'];
    if (days.length > 0 && days.every((day) => weekdayDays.includes(day))) return 'weekdays';
    // single-day weekly with no extras = weekly preset
    if (!byday || days.length === 1) return 'weekly';
    return 'custom';
  }
  if (freq === 'MONTHLY' && !byday) return 'monthly';
  if (freq === 'YEARLY') return 'yearly';
  return 'custom';
};
