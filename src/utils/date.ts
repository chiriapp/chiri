import {
  differenceInCalendarDays,
  format,
  isSameYear,
  isThisWeek,
  isToday,
  isTomorrow,
} from 'date-fns';
import { settingsStore } from '$context/settingsContext';
import type { BadgeTone } from '$types/badge';
import type { DateFormat, TimeFormat } from '$types/settings/categories/region';

/**
 * standard date format strings for consistent formatting across the app
 */
const DATE_FORMATS = {
  shortDate: 'MMM d',
  fullDateTime12: 'MMM d, yyyy h:mm a',
  fullDateTime24: 'MMM d, yyyy HH:mm',
  fullDate: 'MMM d, yyyy',
  monthYear: 'MMMM yyyy',
  dayName: 'EEEE',
  time12: 'h:mm a',
  time24: 'HH:mm',
} as const;

/**
 * mapping from full date format to its month/year header equivalent
 * (used in calendar picker navigation)
 */
const DATE_FORMAT_MONTH_YEAR: Record<DateFormat, string> = {
  'MMM d, yyyy': 'MMMM yyyy',
  'd MMM yyyy': 'MMMM yyyy',
  'MM/dd/yyyy': 'MM/yyyy',
  'dd/MM/yyyy': 'MM/yyyy',
  'yyyy-MM-dd': 'yyyy-MM',
};

/**
 * mapping from full date format to its short (no-year) equivalent
 */
const DATE_FORMAT_SHORT: Record<DateFormat, string> = {
  'MMM d, yyyy': 'MMM d',
  'd MMM yyyy': 'd MMM',
  'MM/dd/yyyy': 'MM/dd',
  'dd/MM/yyyy': 'dd/MM',
  'yyyy-MM-dd': 'MM-dd',
};

/**
 * format a date according to the user's date format preference
 * @param date - the date to format
 * @param withYear - whether to include the year in the output
 * @param dateFormat - override; defaults to the setting from the store
 */
export const formatDate = (date: Date, withYear: boolean, dateFormat?: DateFormat) => {
  const fmt = dateFormat ?? settingsStore.getState().dateFormat;
  const pattern = withYear ? fmt : DATE_FORMAT_SHORT[fmt];
  return format(date, pattern);
};

/**
 * format a month/year header for calendar pickers, respecting the user's date format preference
 * e.g. "March 2026" for MMM-style formats, "03/2026" for numeric, "2026-03" for ISO
 */
export const formatMonthYear = (date: Date, dateFormat?: DateFormat) => {
  const fmt = dateFormat ?? settingsStore.getState().dateFormat;
  return format(date, DATE_FORMAT_MONTH_YEAR[fmt]);
};

/**
 * format time according to user's time format preference
 */
export const formatTime = (date: Date, timeFormat?: TimeFormat) => {
  const format12or24 = timeFormat ?? settingsStore.getState().timeFormat;
  return format(date, format12or24 === '12' ? DATE_FORMATS.time12 : DATE_FORMATS.time24);
};

export const formatDueDate = (date: Date, timeFormat?: TimeFormat) => {
  const d = new Date(date);
  const now = new Date();
  const time = formatTime(d, timeFormat);
  const isOverdue = d.getTime() < now.getTime();
  const dayDiff = differenceInCalendarDays(d, now);

  const overdue: BadgeTone = 'error';
  const dueToday: BadgeTone = 'due-today';
  const neutral: BadgeTone = 'neutral';

  if (isToday(d)) {
    return {
      text: `Today ${time}`,
      tone: isOverdue ? overdue : dueToday,
    };
  }

  if (dayDiff === -1) {
    return { text: `Yesterday ${time}`, tone: overdue };
  }

  if (isTomorrow(d)) {
    return { text: `Tmrw ${time}`, tone: neutral };
  }

  if (isThisWeek(d)) {
    return { text: `${format(d, 'EEE')} ${time}`, tone: isOverdue ? overdue : neutral };
  }

  if (isSameYear(d, now)) {
    return {
      text: `${formatDate(d, false)}, ${time}`,
      tone: isOverdue ? overdue : neutral,
    };
  }

  return {
    text: `${formatDate(d, true)} ${time}`,
    tone: isOverdue ? overdue : neutral,
  };
};

/**
 * format start date for unstarted tasks
 */
export const formatStartDate = (date: Date, timeFormat?: TimeFormat) => {
  const d = new Date(date);
  const now = new Date();
  const color = '#10b981';

  // check if date has a meaningful time component (not midnight)
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
  const timeStr = hasTime ? ` ${formatTime(d, timeFormat)}` : '';

  if (isToday(d)) {
    return { text: `Today${timeStr}`, color };
  }

  if (isTomorrow(d)) {
    return { text: `Tomorrow${timeStr}`, color };
  }

  if (isThisWeek(d)) {
    return { text: `${format(d, DATE_FORMATS.dayName)}${timeStr}`, color };
  }

  if (isSameYear(d, now)) {
    return { text: `${formatDate(d, false)}${timeStr}`, color };
  }

  return { text: `${formatDate(d, true)}${timeStr}`, color };
};

/**
 * render a minutes-since-midnight value as a time label
 */
export const minutesToTimeLabel = (minutes: number) => {
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return formatTime(date);
};

/**
 * parse a `yyyy-mm-dd` date input value into a local date
 */
export const parseDateInputValue = (value: string) => {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};
