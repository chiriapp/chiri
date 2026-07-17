import Moon from 'lucide-react/icons/moon';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import Sun from 'lucide-react/icons/sun';
import Sunrise from 'lucide-react/icons/sunrise';
import Sunset from 'lucide-react/icons/sunset';
import { useMemo, useState } from 'react';
import { TimePickerModal } from '$components/modals/TimePickerModal';
import { useSettingsStore } from '$context/settingsContext';
import { defaultState } from '$context/settingsDefaults';
import type { WorkingDay } from '$types/preference';
import type { QuickTimePresets } from '$types/settings';
import { getOrderedWorkingDays, WORKING_DAY_META } from '$utils/calendar';
import { formatTime } from '$utils/date';

const TIME_CATEGORIES = [
  { id: 'morning' as const, label: 'Morning', Icon: Sunrise },
  { id: 'afternoon' as const, label: 'Afternoon', Icon: Sun },
  { id: 'evening' as const, label: 'Evening', Icon: Sunset },
  { id: 'night' as const, label: 'Night', Icon: Moon },
] as const;

const minutesToTimeLabel = (minutes: number) => {
  const d = new Date();
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return formatTime(d);
};

const presetsEqual = (a: QuickTimePresets, b: QuickTimePresets) =>
  TIME_CATEGORIES.every(({ id }) => a[id] === b[id]);

export const SchedulingSettings = () => {
  const { quickTimePresets, setQuickTimePresets, workingDays, setWorkingDays, startOfWeek } =
    useSettingsStore();
  const [editingCategory, setEditingCategory] = useState<keyof QuickTimePresets | null>(null);
  const currentMinutes = editingCategory ? quickTimePresets[editingCategory] : 0;
  const orderedDays = useMemo(() => getOrderedWorkingDays(startOfWeek), [startOfWeek]);

  const toggleWorkingDay = (day: WorkingDay) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      // preserve the order dictated by the user's "week starts on" preference
      setWorkingDays(orderedDays.filter((d) => workingDays.includes(d) || d === day));
    }
  };

  const handleResetPresets = () => setQuickTimePresets(defaultState.quickTimePresets);
  const handleResetWorkingDays = () => setWorkingDays(defaultState.workingDays);

  const presetsChanged = !presetsEqual(quickTimePresets, defaultState.quickTimePresets);
  const workingDaysChanged =
    workingDays.length !== defaultState.workingDays.length ||
    !workingDays.every((day) => defaultState.workingDays.includes(day));

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">Scheduling</h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="mb-1 font-semibold text-sm text-surface-700 dark:text-surface-300">
              Quick time presets
            </h4>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Shortcuts shown when picking a time in date and reminder pickers
            </p>
          </div>
          {presetsChanged && (
            <button
              type="button"
              onClick={handleResetPresets}
              className="inline-flex items-center gap-1 text-surface-500 text-xs outline-hidden transition-colors hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
        <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
          <div className="p-4">
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
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="mb-1 font-semibold text-sm text-surface-700 dark:text-surface-300">
              Working days
            </h4>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Days used for "next working day" shortcuts and weekday recurrence
            </p>
          </div>
          {workingDaysChanged && (
            <button
              type="button"
              onClick={handleResetWorkingDays}
              className="inline-flex items-center gap-1 text-surface-500 text-xs outline-hidden transition-colors hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
        <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
          <div className="flex items-center gap-2 p-4">
            {orderedDays.map((day) => {
              const active = workingDays.includes(day);
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => toggleWorkingDay(day)}
                  aria-pressed={active}
                  className={`h-9 flex-1 rounded-md font-medium text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                    active
                      ? 'bg-primary-500 text-primary-contrast'
                      : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-700 dark:text-surface-400 dark:hover:bg-surface-600'
                  }`}
                >
                  {WORKING_DAY_META[day].shortLabel}
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
