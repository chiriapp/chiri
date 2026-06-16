import CalendarDays from 'lucide-react/icons/calendar-days';
import Clock from 'lucide-react/icons/clock';
import Globe from 'lucide-react/icons/globe';
import { useEffect, useRef, useState } from 'react';
import { Select } from '$components/Select';
import { DATE_FORMAT_OPTIONS, WEEK_START_OPTIONS } from '$constants/settings';
import { useSettingsStore } from '$context/settingsContext';
import { getSystemRegionPreferences } from '$lib/preferences';
import type {
  DateFormat,
  StartOfWeek,
  SystemRegionPreferences,
  TimeFormat,
} from '$types/preference';

let nativeDefaultsApplied = false;

export const RegionTimeSettings = () => {
  const { dateFormat, setDateFormat, timeFormat, setTimeFormat, startOfWeek, setStartOfWeek } =
    useSettingsStore();
  const [systemPreferences, setSystemPreferences] = useState<SystemRegionPreferences | null>(null);
  const userEditedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadPreferences = async () => {
      try {
        const preferences = await getSystemRegionPreferences();
        if (cancelled) return;

        setSystemPreferences(preferences);

        if (!nativeDefaultsApplied) {
          nativeDefaultsApplied = true;
          if (!userEditedRef.current) {
            if (preferences.dateFormat) setDateFormat(preferences.dateFormat);
            if (preferences.timeFormat) setTimeFormat(preferences.timeFormat);
            if (preferences.startOfWeek) setStartOfWeek(preferences.startOfWeek);
          }
        }
      } catch (error) {
        console.error('Failed to load native region preferences:', error);
      }
    };

    loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [setDateFormat, setStartOfWeek, setTimeFormat]);

  const markEdited = () => {
    userEditedRef.current = true;
  };

  const handleDateFormatChange = (value: DateFormat) => {
    markEdited();
    setDateFormat(value);
  };

  const handleTimeFormatChange = (value: TimeFormat) => {
    markEdited();
    setTimeFormat(value);
  };

  const handleStartOfWeekChange = (value: StartOfWeek) => {
    markEdited();
    setStartOfWeek(value);
  };

  const systemLabel = systemPreferences ? 'Detected from system' : 'Detecting system defaults';

  return (
    <section className="space-y-3 rounded-lg border border-surface-200 p-3 dark:border-surface-700">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary-500" />
          <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-100">
            Region & time
          </h3>
        </div>
        <div className="max-w-64 truncate text-surface-500 text-xs dark:text-surface-400">
          {systemLabel}
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-surface-200 p-2.5 dark:border-surface-700">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-200">
              <CalendarDays className="h-4 w-4" />
            </span>

            <div className="flex flex-col">
              <span className="min-w-0 font-medium text-sm text-surface-900 dark:text-surface-100">
                Date format
              </span>

              <span className="min-w-0 text-surface-500 text-xs dark:text-surface-400">
                How dates appear throughout the app
              </span>
            </div>
          </div>
          <Select
            value={dateFormat}
            onChange={(event) => handleDateFormatChange(event.target.value as DateFormat)}
            className="max-w-44 shrink-0 rounded-lg border border-surface-200 bg-surface-50 text-sm text-surface-800 outline-hidden transition-colors focus:border-primary-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
          >
            {DATE_FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-surface-200 p-2.5 dark:border-surface-700">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-200">
              <Clock className="h-4 w-4" />
            </span>
            <div className="flex flex-col">
              <span className="min-w-0 font-medium text-sm text-surface-900 dark:text-surface-100">
                Time format
              </span>
              <span className="min-w-0 text-surface-500 text-xs dark:text-surface-400">
                12-hour (AM/PM) or 24-hour clock
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {(
              [
                ['12', '12-hour'],
                ['24', '24-hour'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => handleTimeFormatChange(value)}
                className={`rounded-lg border px-3 py-1.5 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                  timeFormat === value
                    ? 'border-primary-500/60 bg-primary-500/10 text-surface-950 dark:text-surface-50'
                    : 'border-surface-200 bg-surface-50 text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-surface-200 p-2.5 dark:border-surface-700">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-200">
              <CalendarDays className="h-4 w-4" />
            </span>

            <div className="flex flex-col">
              <span className="min-w-0 font-medium text-sm text-surface-900 dark:text-surface-100">
                Week starts on
              </span>
              <span className="min-w-0 text-surface-500 text-xs dark:text-surface-400">
                First day of the week in date pickers
              </span>
            </div>
          </div>
          <Select
            value={startOfWeek}
            onChange={(event) => handleStartOfWeekChange(event.target.value as StartOfWeek)}
            className="max-w-40 shrink-0 rounded-lg border border-surface-200 bg-surface-50 text-sm text-surface-800 outline-hidden transition-colors focus:border-primary-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
          >
            {WEEK_START_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </section>
  );
};
