import Moon from 'lucide-react/icons/moon';
import Sun from 'lucide-react/icons/sun';
import Sunrise from 'lucide-react/icons/sunrise';
import Sunset from 'lucide-react/icons/sunset';
import { useState } from 'react';
import { TimePickerModal } from '$components/modals/TimePickerModal';
import { Select } from '$components/Select';
import { DATE_FORMAT_OPTIONS, WEEK_START_OPTIONS } from '$constants/settings';
import { useSettingsStore } from '$context/settingsContext';
import type { DateFormat, StartOfWeek } from '$types/preference';
import type { QuickTimePresets } from '$types/settings';
import { formatTime } from '$utils/date';

const TIME_CATEGORIES = [
  { id: 'morning' as const, label: 'Morning', Icon: Sunrise },
  { id: 'afternoon' as const, label: 'Afternoon', Icon: Sun },
  { id: 'evening' as const, label: 'Evening', Icon: Sunset },
  { id: 'night' as const, label: 'Night', Icon: Moon },
];

export const RegionAndTimeSettings = () => {
  const {
    startOfWeek,
    setStartOfWeek,
    timeFormat,
    setTimeFormat,
    dateFormat,
    setDateFormat,
    quickTimePresets,
    setQuickTimePresets,
  } = useSettingsStore();

  const [editingCategory, setEditingCategory] = useState<keyof QuickTimePresets | null>(null);

  const selectClassName =
    'text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors shrink-0';

  const minutesToTimeLabel = (minutes: number) => {
    const d = new Date();
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return formatTime(d);
  };

  const currentMinutes = editingCategory ? quickTimePresets[editingCategory] : 0;

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

      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">
        Quick time presets
      </h3>
      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="p-4">
          <p className="mb-3 text-surface-500 text-xs dark:text-surface-400">
            Shortcuts shown when picking a time in date and reminder pickers
          </p>
          <div className="space-y-2">
            {TIME_CATEGORIES.map(({ id, label, Icon }) => {
              const presetMinutes = quickTimePresets[id];

              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => setEditingCategory(id)}
                  className="flex w-full items-center justify-between gap-4 rounded-lg border border-transparent bg-surface-50 px-3 py-2.5 outline-hidden transition-colors hover:border-surface-200 hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-700/50 dark:hover:border-surface-600 dark:hover:bg-surface-700"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0 text-surface-500 dark:text-surface-400" />
                    <span className="font-medium text-sm text-surface-700 dark:text-surface-300">
                      {label}
                    </span>
                  </div>
                  <span className="font-semibold text-sm text-surface-700 tabular-nums dark:text-surface-300">
                    {minutesToTimeLabel(presetMinutes)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <TimePickerModal
        isOpen={editingCategory !== null}
        onClose={() => setEditingCategory(null)}
        onConfirm={(hour, minute) => {
          if (editingCategory) {
            setQuickTimePresets({
              ...quickTimePresets,
              [editingCategory]: hour * 60 + minute,
            });
          }
          setEditingCategory(null);
        }}
        initialHour={Math.floor(currentMinutes / 60)}
        initialMinute={currentMinutes % 60}
        title="Edit time preset"
        description={TIME_CATEGORIES.find((cat) => cat.id === editingCategory)?.label}
      />
    </div>
  );
};
