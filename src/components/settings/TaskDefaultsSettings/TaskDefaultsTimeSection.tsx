import RotateCcw from 'lucide-react/icons/rotate-ccw';
import { useState } from 'react';
import { TimePickerModal } from '$components/modals/TimePickerModal';
import { useSettingsStore } from '$context/settingsContext';
import { defaultState } from '$context/settingsDefaults';

const formatTimeLabel = (minutes: number | null, use24h: boolean) => {
  if (minutes === null) return 'No default time';
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  if (use24h) return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  if (hour === 0) return `12:${String(minute).padStart(2, '0')} AM`;
  if (hour < 12) return `${hour}:${String(minute).padStart(2, '0')} AM`;
  if (hour === 12) return `12:${String(minute).padStart(2, '0')} PM`;
  return `${hour - 12}:${String(minute).padStart(2, '0')} PM`;
};

export const TaskDefaultsTimeSection = () => {
  const { defaultStartTime, setDefaultStartTime, defaultDueTime, setDefaultDueTime, timeFormat } =
    useSettingsStore();
  const use24h = timeFormat === '24';

  const [editingStartTime, setEditingStartTime] = useState(false);
  const [editingDueTime, setEditingDueTime] = useState(false);

  const handleReset = () => {
    setDefaultStartTime(defaultState.defaultStartTime);
    setDefaultDueTime(defaultState.defaultDueTime);
  };

  const hasChanged =
    defaultStartTime !== defaultState.defaultStartTime ||
    defaultDueTime !== defaultState.defaultDueTime;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">Time</h4>
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
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Default start time</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Time applied when a new task has a start date
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditingStartTime(true)}
            className="shrink-0 rounded-lg border border-transparent bg-surface-100 px-3 py-1 text-sm text-surface-800 outline-hidden transition-colors hover:bg-surface-200 focus:border-primary-500 focus:bg-white dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800 dark:hover:bg-surface-600"
          >
            {formatTimeLabel(defaultStartTime, use24h)}
          </button>
        </div>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Default due time</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Time applied when a new task has a due date
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditingDueTime(true)}
            className="shrink-0 rounded-lg border border-transparent bg-surface-100 px-3 py-1 text-sm text-surface-800 outline-hidden transition-colors hover:bg-surface-200 focus:border-primary-500 focus:bg-white dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800 dark:hover:bg-surface-600"
          >
            {formatTimeLabel(defaultDueTime, use24h)}
          </button>
        </div>
      </div>

      <TimePickerModal
        isOpen={editingStartTime}
        onClose={() => setEditingStartTime(false)}
        onConfirm={(hour, minute) => {
          setDefaultStartTime(hour * 60 + minute);
          setEditingStartTime(false);
        }}
        initialHour={defaultStartTime !== null ? Math.floor(defaultStartTime / 60) : 9}
        initialMinute={defaultStartTime !== null ? defaultStartTime % 60 : 0}
        title="Default start time"
        description="Time applied to new tasks with a start date"
      />

      <TimePickerModal
        isOpen={editingDueTime}
        onClose={() => setEditingDueTime(false)}
        onConfirm={(hour, minute) => {
          setDefaultDueTime(hour * 60 + minute);
          setEditingDueTime(false);
        }}
        initialHour={defaultDueTime !== null ? Math.floor(defaultDueTime / 60) : 9}
        initialMinute={defaultDueTime !== null ? defaultDueTime % 60 : 0}
        title="Default due time"
        description="Time applied to new tasks with a due date"
      />
    </div>
  );
};
