export type StartOfWeek =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';
export type TimeFormat = '12' | '24';
export type DateFormat = 'MMM d, yyyy' | 'd MMM yyyy' | 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd';
export type WorkingDay = 'su' | 'mo' | 'tu' | 'we' | 'th' | 'fr' | 'sa';
export type WorkingDays = WorkingDay[];

export interface SystemRegionPreferences {
  locale: string | null;
  timezone: string | null;
  dateFormat: DateFormat | null;
  timeFormat: TimeFormat | null;
  startOfWeek: StartOfWeek | null;
}
