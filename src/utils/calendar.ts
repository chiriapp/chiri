type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

export const DAYS_OF_WEEK_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;
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
