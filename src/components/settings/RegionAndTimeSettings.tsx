import { Select } from '$components/Select';
import { DATE_FORMAT_OPTIONS, WEEK_START_OPTIONS } from '$constants/settings';
import { useSettingsStore } from '$context/settingsContext';
import type { DateFormat, StartOfWeek } from '$types/preference';

export const RegionAndTimeSettings = () => {
  const { startOfWeek, setStartOfWeek, timeFormat, setTimeFormat, dateFormat, setDateFormat } =
    useSettingsStore();

  const selectClassName =
    'text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors shrink-0';

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">
        Region & time
      </h3>
      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Date format</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              How dates appear throughout the app
            </p>
          </div>
          <Select
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value as DateFormat)}
            className={selectClassName}
          >
            {DATE_FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Time format</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              12-hour (AM/PM) or 24-hour clock
            </p>
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
                onClick={() => setTimeFormat(value)}
                className={`flex items-center rounded-lg border px-3 py-1.5 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                  timeFormat === value
                    ? 'border-surface-300 bg-surface-200 text-surface-900 dark:border-surface-500 dark:bg-surface-700 dark:text-surface-100'
                    : 'border-transparent bg-surface-100 text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:bg-surface-700/50 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Week starts on</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              First day of the week in date pickers
            </p>
          </div>
          <Select
            value={startOfWeek}
            onChange={(e) => setStartOfWeek(e.target.value as StartOfWeek)}
            className={selectClassName}
          >
            {WEEK_START_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
};
