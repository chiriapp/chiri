import { AppSelect } from '$components/AppSelect';
import { DATE_FORMAT_OPTIONS, WEEK_START_OPTIONS } from '$data/settings';
import { useSettingsStore } from '$hooks/useSettingsStore';
import type { DateFormat, StartOfWeek, TimeFormat } from '$types/index';

export const RegionSettings = () => {
  const { startOfWeek, setStartOfWeek, timeFormat, setTimeFormat, dateFormat, setDateFormat } =
    useSettingsStore();

  const selectClassName =
    'text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors shrink-0';

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">Region</h3>
      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Date format</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              How dates appear throughout the app
            </p>
          </div>
          <AppSelect
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value as DateFormat)}
            className={selectClassName}
          >
            {DATE_FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AppSelect>
        </div>

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Time format</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              12-hour (AM/PM) or 24-hour clock
            </p>
          </div>
          <AppSelect
            value={timeFormat}
            onChange={(e) => setTimeFormat(e.target.value as TimeFormat)}
            className={selectClassName}
          >
            <option value="12">12-hour</option>
            <option value="24">24-hour</option>
          </AppSelect>
        </div>

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Week starts on</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              First day of the week in date pickers
            </p>
          </div>
          <AppSelect
            value={startOfWeek}
            onChange={(e) => setStartOfWeek(e.target.value as StartOfWeek)}
            className={selectClassName}
          >
            {WEEK_START_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AppSelect>
        </div>
      </div>
    </div>
  );
};
