import RotateCcw from 'lucide-react/icons/rotate-ccw';
import { Select } from '$components/Select';
import { useSettingsStore } from '$context/settingsContext';
import { defaultState } from '$context/settingsDefaults';
import type { DefaultDateOffset } from '$types';

const DUE_DATE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'next-working-day', label: 'Next business day' },
  { value: '1week', label: 'In 1 week' },
  { value: '2weeks', label: 'In 2 weeks' },
] as const;

const START_DATE_OPTION_GROUPS = [
  {
    label: 'Relative to today',
    options: [
      { value: 'today', label: 'Today' },
      { value: 'tomorrow', label: 'Tomorrow' },
      { value: 'next-working-day', label: 'Next business day' },
      { value: '1week', label: 'In 1 week' },
      { value: '2weeks', label: 'In 2 weeks' },
    ],
  },
  {
    label: 'Relative to due date',
    options: [
      { value: 'due-date', label: 'Due date' },
      { value: 'due-time', label: 'Due time' },
      { value: '1day-before-due', label: 'Day before due' },
      { value: '1week-before-due', label: 'Week before due' },
    ],
  },
] as const;

const selectClassName =
  'w-[160px] text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors shrink-0';

export const TaskDefaultsDateSection = () => {
  const { defaultStartDate, setDefaultStartDate, defaultDueDate, setDefaultDueDate } =
    useSettingsStore();

  const handleReset = () => {
    setDefaultStartDate(defaultState.defaultStartDate);
    setDefaultDueDate(defaultState.defaultDueDate);
  };

  const hasChanged =
    defaultStartDate !== defaultState.defaultStartDate ||
    defaultDueDate !== defaultState.defaultDueDate;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">Date</h4>
        {hasChanged && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-surface-500 text-xs outline-hidden transition-colors hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="flex items-center justify-between gap-4 p-4">
          <p className="text-sm text-surface-700 dark:text-surface-300">Start date</p>
          <Select
            value={defaultStartDate}
            onChange={(e) => setDefaultStartDate(e.target.value as DefaultDateOffset)}
            className={selectClassName}
          >
            <option value="none">None</option>
            {START_DATE_OPTION_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </div>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <div className="flex items-center justify-between gap-4 p-4">
          <p className="text-sm text-surface-700 dark:text-surface-300">Due date</p>
          <Select
            value={defaultDueDate}
            onChange={(e) => setDefaultDueDate(e.target.value as typeof defaultDueDate)}
            className={selectClassName}
          >
            {DUE_DATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
};
