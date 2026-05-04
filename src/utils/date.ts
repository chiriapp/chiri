import {
  differenceInCalendarDays,
  format,
  isSameYear,
  isThisWeek,
  isToday,
  isTomorrow,
} from 'date-fns';
import { settingsStore } from '$context/settingsContext';
import type { DateFormat, TimeFormat } from '$types';

/**
 * Standard date format strings for consistent formatting across the app
 */
export const DATE_FORMATS = {
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
 * Mapping from full date format to its month/year header equivalent
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
 * Mapping from full date format to its short (no-year) equivalent
 */
const DATE_FORMAT_SHORT: Record<DateFormat, string> = {
  'MMM d, yyyy': 'MMM d',
  'd MMM yyyy': 'd MMM',
  'MM/dd/yyyy': 'MM/dd',
  'dd/MM/yyyy': 'dd/MM',
  'yyyy-MM-dd': 'MM-dd',
};

/**
 * Format a date according to the user's date format preference.
 * @param date - The date to format
 * @param withYear - Whether to include the year in the output
 * @param dateFormat - Override; defaults to the setting from the store
 */
export const formatDate = (date: Date, withYear: boolean, dateFormat?: DateFormat) => {
  const fmt = dateFormat ?? settingsStore.getState().dateFormat;
  const pattern = withYear ? fmt : DATE_FORMAT_SHORT[fmt];
  return format(date, pattern);
};

/**
 * Format a month/year header for calendar pickers, respecting the user's date format preference.
 * e.g. "March 2026" for MMM-style formats, "03/2026" for numeric, "2026-03" for ISO.
 */
export const formatMonthYear = (date: Date, dateFormat?: DateFormat) => {
  const fmt = dateFormat ?? settingsStore.getState().dateFormat;
  return format(date, DATE_FORMAT_MONTH_YEAR[fmt]);
};

/**
 * Format time according to user's time format preference
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

  const overdue = 'border-semantic-error/30 bg-semantic-error/10 text-semantic-error';
  const neutral =
    'border-surface-300 dark:border-surface-600 bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400';

  if (isToday(d)) {
    return {
      text: `Today ${time}`,
      className: isOverdue
        ? overdue
        : 'border-semantic-warning/30 bg-semantic-warning/10 text-semantic-warning',
    };
  }

  if (dayDiff === -1) {
    return { text: `Yesterday ${time}`, className: overdue };
  }

  if (isTomorrow(d)) {
    return { text: `Tmrw ${time}`, className: neutral };
  }

  if (isThisWeek(d)) {
    return { text: `${format(d, 'EEE')} ${time}`, className: neutral };
  }

  if (isSameYear(d, now)) {
    return {
      text: `${formatDate(d, false)}, ${time}`,
      className: isOverdue ? overdue : neutral,
    };
  }

  return {
    text: `${formatDate(d, true)} ${time}`,
    className: isOverdue ? overdue : neutral,
  };
};

/**
 * Format start date for unstarted tasks
 */
export const formatStartDate = (date: Date, timeFormat?: TimeFormat) => {
  const d = new Date(date);
  const now = new Date();
  const colors = {
    borderColor: '#10b981',
    bgColor: '#10b98115',
    textColor: '#10b981',
  };

  // Check if date has a meaningful time component (not midnight)
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
  const timeStr = hasTime ? ` ${formatTime(d, timeFormat)}` : '';

  if (isToday(d)) {
    return {
      text: `Today${timeStr}`,
      className: 'text-surface-600 dark:text-surface-400 bg-surface-100 dark:bg-surface-700',
      ...colors,
    };
  }

  if (isTomorrow(d)) {
    return {
      text: `Tomorrow${timeStr}`,
      className: 'text-surface-600 dark:text-surface-400 bg-surface-100 dark:bg-surface-700',
      ...colors,
    };
  }

  if (isThisWeek(d)) {
    return {
      text: `${format(d, DATE_FORMATS.dayName)}${timeStr}`, // Full day name
      className: 'text-surface-600 dark:text-surface-400 bg-surface-100 dark:bg-surface-700',
      ...colors,
    };
  }

  if (isSameYear(d, now)) {
    return {
      text: `${formatDate(d, false)}${timeStr}`,
      className: 'text-surface-600 dark:text-surface-400 bg-surface-100 dark:bg-surface-700',
      ...colors,
    };
  }

  return {
    text: `${formatDate(d, true)}${timeStr}`,
    className: 'text-surface-600 dark:text-surface-400 bg-surface-100 dark:bg-surface-700',
    ...colors,
  };
};
