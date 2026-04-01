import Moon from 'lucide-react/icons/moon';
import Sun from 'lucide-react/icons/sun';
import Sunrise from 'lucide-react/icons/sunrise';
import Sunset from 'lucide-react/icons/sunset';
import X from 'lucide-react/icons/x';
import { useState } from 'react';
import { AppSelect } from '$components/AppSelect';
import { DATE_FORMAT_OPTIONS, WEEK_START_OPTIONS } from '$constants/settings';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import type { DateFormat, StartOfWeek, TimeFormat } from '$types';
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
  const [editHour, setEditHour] = useState(0);
  const [editMinute, setEditMinute] = useState(0);

  const minutesToTimeLabel = (minutes: number): string => {
    const d = new Date();
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return formatTime(d);
  };

  const editTimePreview = (() => {
    const d = new Date();
    d.setHours(editHour, editMinute, 0, 0);
    return formatTime(d);
  })();

  const selectClassName =
    'text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors shrink-0';

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">
        Region & time
      </h3>
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

      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">
        Date picker
      </h3>
      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <div className="p-4">
          <p className="text-sm text-surface-700 dark:text-surface-300">Quick time presets</p>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Shortcuts shown when picking a time in date and reminder pickers
          </p>

          <div className="mt-4 space-y-3">
            {TIME_CATEGORIES.map(({ id, label, Icon }) => (
              <div key={id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-surface-400 flex-shrink-0" />
                  <span className="text-sm text-surface-700 dark:text-surface-300">{label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditHour(Math.floor(quickTimePresets[id] / 60));
                    setEditMinute(quickTimePresets[id] % 60);
                    setEditingCategory(id);
                  }}
                  className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                >
                  {minutesToTimeLabel(quickTimePresets[id])}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editingCategory && (
        // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click closes modal
        // biome-ignore lint/a11y/useKeyWithClickEvents: closed via X button and Cancel
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 animate-fade-in"
          onClick={() => setEditingCategory(null)}
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: stops backdrop propagation */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: handled by buttons inside */}
          <div
            className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-xs animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
              <h2 className="text-base font-semibold text-surface-800 dark:text-surface-200">
                Change time
              </h2>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center gap-5">
              <p className="text-3xl font-semibold text-surface-800 dark:text-surface-200 tabular-nums tracking-tight">
                {editTimePreview}
              </p>
              <div className="flex items-center gap-3">
                <AppSelect
                  value={editHour}
                  onChange={(e) => setEditHour(parseInt(e.target.value, 10))}
                  className={selectClassName}
                  aria-label="Hour"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}
                    </option>
                  ))}
                </AppSelect>
                <span className="text-lg font-medium text-surface-500 dark:text-surface-400">
                  :
                </span>
                <AppSelect
                  value={editMinute}
                  onChange={(e) => setEditMinute(parseInt(e.target.value, 10))}
                  className={selectClassName}
                  aria-label="Minute"
                >
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                    <option key={m} value={m}>
                      {m.toString().padStart(2, '0')}
                    </option>
                  ))}
                </AppSelect>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-surface-200 dark:border-surface-700">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickTimePresets({
                    ...quickTimePresets,
                    [editingCategory]: editHour * 60 + editMinute,
                  });
                  setEditingCategory(null);
                }}
                className="px-4 py-2 text-sm font-medium text-primary-contrast bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
