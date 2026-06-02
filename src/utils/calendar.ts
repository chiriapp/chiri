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
 * Convert week start setting to numeric value (0=Sun, 1=Mon, ..., 6=Sat)
 */
export const getWeekStartValue = (setting: string): WeekStartDay => {
  return WEEK_START_MAP[setting] ?? 1;
};

/**
 * Get days of week labels based on week start setting
 * @param weekStartsOn - 0–6 where 0=Sunday
 * @returns Array of day labels properly ordered
 */
export const getDaysOfWeekLabels = (weekStartsOn: WeekStartDay): readonly string[] => {
  return [
    ...DAYS_OF_WEEK_LABELS.slice(weekStartsOn),
    ...DAYS_OF_WEEK_LABELS.slice(0, weekStartsOn),
  ];
};

/**
 * Calculate padding needed at start of month grid based on first day of month
 * @param firstDayOfMonth - Day of week (0-6, where 0 is Sunday)
 * @param weekStartsOn - 0–6 where 0=Sunday
 * @returns Number of empty cells needed at start of grid
 */
export const getMonthStartPadding = (firstDayOfMonth: number, weekStartsOn: WeekStartDay) => {
  return (firstDayOfMonth - weekStartsOn + 7) % 7;
};

/**
 * Create padded days array for a stable six-row calendar grid
 * @param days - Array of dates in the month
 * @param startPadding - Number of empty cells at start
 * @returns Array with null values for padding followed by dates and trailing empty cells
 */
export const createPaddedDaysArray = (days: Date[], startPadding: number): (Date | null)[] => {
  const paddedDays = Array(startPadding).fill(null).concat(days);
  const endPadding = Math.max(0, CALENDAR_GRID_CELLS - paddedDays.length);
  return paddedDays.concat(Array(endPadding).fill(null));
};

/**
 * Create a date with specific time components
 * @param baseDate - Base date to copy
 * @param hours - Hours to set
 * @param minutes - Minutes to set
 * @returns New date with time set
 */
export const setDateTime = (baseDate: Date, hours: number, minutes: number) => {
  const newDate = new Date(baseDate);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
};

/**
 * Create an all-day date (time set to 00:00:00)
 * @param date - Date to convert
 * @returns New date with time set to start of day
 */
export const createAllDayDate = (date: Date) => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};
