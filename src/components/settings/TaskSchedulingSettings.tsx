import Moon from 'lucide-react/icons/moon';
import Sun from 'lucide-react/icons/sun';
import Sunrise from 'lucide-react/icons/sunrise';
import Sunset from 'lucide-react/icons/sunset';
import { useState } from 'react';
import { TimePickerModal } from '$components/modals/TimePickerModal';
import { useSettingsStore } from '$context/settingsContext';
import type { QuickTimePresets } from '$types/settings';
import { formatTime } from '$utils/date';

const TIME_CATEGORIES = [
  { id: 'morning' as const, label: 'Morning', Icon: Sunrise },
  { id: 'afternoon' as const, label: 'Afternoon', Icon: Sun },
  { id: 'evening' as const, label: 'Evening', Icon: Sunset },
  { id: 'night' as const, label: 'Night', Icon: Moon },
];

export const TaskSchedulingSettings = () => {
  const { quickTimePresets, setQuickTimePresets } = useSettingsStore();
  const [editingCategory, setEditingCategory] = useState<keyof QuickTimePresets | null>(null);
  const currentMinutes = editingCategory ? quickTimePresets[editingCategory] : 0;

  const minutesToTimeLabel = (minutes: number) => {
    const d = new Date();
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return formatTime(d);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">Scheduling</h3>

      <div>
        <h4 className="mb-2 font-semibold text-sm text-surface-700 dark:text-surface-300">
          Quick time presets
        </h4>
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
