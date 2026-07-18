import { addDays, startOfDay } from 'date-fns';
import type { StartOfWeek, WorkingDay } from '$types/preference';

type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

export const WORKING_DAY_META: Record<
  WorkingDay,
  { dayIndex: number; rruleByday: string; shortLabel: string; longLabel: string }
> = {
  su: { dayIndex: 0, rruleByday: 'SU', shortLabel: 'Sun', longLabel: 'Sunday' },
  mo: { dayIndex: 1, rruleByday: 'MO', shortLabel: 'Mon', longLabel: 'Monday' },
  tu: { dayIndex: 2, rruleByday: 'TU', shortLabel: 'Tue', longLabel: 'Tuesday' },
  we: { dayIndex: 3, rruleByday: 'WE', shortLabel: 'Wed', longLabel: 'Wednesday' },
  th: { dayIndex: 4, rruleByday: 'TH', shortLabel: 'Thu', longLabel: 'Thursday' },
  fr: { dayIndex: 5, rruleByday: 'FR', shortLabel: 'Fri', longLabel: 'Friday' },
  sa: { dayIndex: 6, rruleByday: 'SA', shortLabel: 'Sat', longLabel: 'Saturday' },
};

export const getWorkingDayMeta = (day: WorkingDay) => WORKING_DAY_META[day];

const DEFAULT_WORKING_DAYS: WorkingDay[] = ['mo', 'tu', 'we', 'th', 'fr'];

/**
 * check whether a date falls on one of the configured working days
 */
export const isWorkingDay = (date: Date, workingDays: WorkingDay[] = DEFAULT_WORKING_DAYS) => {
  const allowed = new Set(workingDays.map((d) => WORKING_DAY_META[d].dayIndex));
  return allowed.has(date.getDay());
};

/**
 * get the next working day strictly after the given date.
 * if the given date is already a working day, it still returns the following working day.
 */
export const getNextWorkingDay = (
  date: Date,
  workingDays: WorkingDay[] = DEFAULT_WORKING_DAYS,
): Date => {
  const allowed = new Set(workingDays.map((d) => WORKING_DAY_META[d].dayIndex));
  let candidate = addDays(startOfDay(date), 1);
  while (!allowed.has(candidate.getDay())) {
    candidate = addDays(candidate, 1);
  }
  return candidate;
};

const DAY_INDEX_TO_WORKING_DAY: Record<number, WorkingDay> = Object.fromEntries(
  Object.entries(WORKING_DAY_META).map(([day, meta]) => [meta.dayIndex, day]),
) as Record<number, WorkingDay>;

/**
 * return working day identifiers ordered by the user's "week starts on" preference
 */
export const getOrderedWorkingDays = (startOfWeek: StartOfWeek): WorkingDay[] => {
  const weekStart = getWeekStartValue(startOfWeek);
  const indices = Array.from({ length: 7 }, (_, index) => (weekStart + index) % 7);
  return indices.map((index) => DAY_INDEX_TO_WORKING_DAY[index]);
};

export const DAYS_OF_WEEK_LABELS = Object.entries(WORKING_DAY_META)
  .sort(([, a], [, b]) => a.dayIndex - b.dayIndex)
  .map(([, meta]) => meta.shortLabel.slice(0, 2));
const CALENDAR_GRID_CELLS = 42;

const WEEK_START_MAP: Record<string, WeekStartDay> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * convert week start setting to numeric value (0=Sun, 1=Mon, ..., 6=Sat)
 */
export const getWeekStartValue = (setting: string) => {
  return WEEK_START_MAP[setting] ?? 1;
};

/**
 * get days of week labels based on week start setting
 * @param weekStartsOn - 0–6 where 0=Sunday
 * @returns array of day labels properly ordered
 */
export const getDaysOfWeekLabels = (weekStartsOn: WeekStartDay): readonly string[] => {
  return [
    ...DAYS_OF_WEEK_LABELS.slice(weekStartsOn),
    ...DAYS_OF_WEEK_LABELS.slice(0, weekStartsOn),
  ];
};

/**
 * calculate padding needed at start of month grid based on first day of month
 * @param firstDayOfMonth - day of week (0-6, where 0 is Sunday)
 * @param weekStartsOn - 0–6 where 0=Sunday
 * @returns number of empty cells needed at start of grid
 */
export const getMonthStartPadding = (firstDayOfMonth: number, weekStartsOn: WeekStartDay) => {
  return (firstDayOfMonth - weekStartsOn + 7) % 7;
};

/**
 * create padded days array for a stable six-row calendar grid
 * @param days - array of dates in the month
 * @param startPadding - number of empty cells at start
 * @returns array with null values for padding followed by dates and trailing empty cells
 */
export const createPaddedDaysArray = (days: Date[], startPadding: number): (Date | null)[] => {
  const paddedDays = Array(startPadding).fill(null).concat(days);
  const endPadding = Math.max(0, CALENDAR_GRID_CELLS - paddedDays.length);
  return paddedDays.concat(Array(endPadding).fill(null));
};

/**
 * create a date with specific time components
 * @param baseDate - base date to copy
 * @param hours - hours to set
 * @param minutes - minutes to set
 * @returns new date with time set
 */
export const setDateTime = (baseDate: Date, hours: number, minutes: number) => {
  const newDate = new Date(baseDate);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
};

/**
 * create an all-day date (time set to 00:00:00)
 * @param date - date to convert
 * @returns new date with time set to start of day
 */
export const createAllDayDate = (date: Date) => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};
