import Check from 'lucide-react/icons/check';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import Timer from 'lucide-react/icons/timer';
import X from 'lucide-react/icons/x';
import { useSettingsStore } from '$context/settingsContext';
import { defaultState } from '$context/settingsDefaults';
import { buildProgressUpdates, buildStatusUpdates } from '$lib/task/status';
import type { Status } from '$types/task/model';

const STATUS_OPTIONS = [
  {
    value: 'needs-action',
    label: 'Needs Action',
    Icon: RotateCcw,
    hoverBorderColor: 'hover:border-status-needs-action/70',
    activeClass:
      'border-status-needs-action bg-status-needs-action/15 text-surface-900 dark:text-surface-100',
  },
  {
    value: 'in-process',
    label: 'In Process',
    Icon: Timer,
    hoverBorderColor: 'hover:border-status-in-process/70',
    activeClass:
      'border-status-in-process bg-status-in-process/15 text-surface-900 dark:text-surface-100',
  },
  {
    value: 'completed',
    label: 'Completed',
    Icon: Check,
    hoverBorderColor: 'hover:border-status-completed/70',
    activeClass:
      'border-status-completed bg-status-completed/15 text-surface-900 dark:text-surface-100',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    Icon: X,
    hoverBorderColor: 'hover:border-status-cancelled/70',
    activeClass:
      'border-status-cancelled bg-status-cancelled/15 text-surface-900 dark:text-surface-100',
  },
] as const;

export const TaskDefaultsSettingsStatusSection = () => {
  const {
    defaultStatus,
    setDefaultStatus,
    defaultPercentComplete,
    setDefaultPercentComplete,
    syncStatusProgress,
    progressIncrement,
    useAccentColorForCheckboxes,
  } = useSettingsStore();

  const handleStatusChange = (status: Status) => {
    setDefaultStatus(status);
    if (syncStatusProgress) {
      const updates = buildStatusUpdates(status, { percentComplete: defaultPercentComplete });
      if (updates.percentComplete !== undefined) {
        setDefaultPercentComplete(updates.percentComplete);
      }
    }
  };

  const handlePercentChange = (percent: number) => {
    const updates = buildProgressUpdates(
      percent,
      { percentComplete: defaultPercentComplete },
      new Date(),
      syncStatusProgress,
    );
    if (updates.status !== undefined) {
      setDefaultStatus(updates.status);
    }
    setDefaultPercentComplete(updates.percentComplete ?? percent);
  };

  const handleReset = () => {
    setDefaultStatus(defaultState.defaultStatus);
    setDefaultPercentComplete(defaultState.defaultPercentComplete);
  };

  const hasChanged =
    defaultStatus !== defaultState.defaultStatus ||
    defaultPercentComplete !== defaultState.defaultPercentComplete;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">
          Status &amp; progress
        </h4>
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

      <div className="overflow-hidden rounded-lg border border-surface-300 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="p-4">
          <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">Status</p>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map(({ value, label, Icon, hoverBorderColor, activeClass }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleStatusChange(value as Status)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-medium text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset ${
                  defaultStatus === value
                    ? value === 'completed' && useAccentColorForCheckboxes
                      ? 'border-primary-ink bg-primary-500/15 text-surface-900 dark:text-surface-100'
                      : activeClass
                    : `border-surface-300 text-surface-600 ${value === 'completed' && useAccentColorForCheckboxes ? 'hover:border-primary-ink/70' : hoverBorderColor} hover:bg-surface-50 hover:text-surface-700 dark:border-surface-600 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-300`
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-surface-300 border-t dark:border-surface-700" />

        <div className="p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="font-medium text-surface-500 text-xs dark:text-surface-400">Progress</p>
            <span className="font-medium text-surface-600 text-xs dark:text-surface-400">
              {defaultPercentComplete}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={progressIncrement}
            value={defaultPercentComplete}
            style={{ '--pct': `${defaultPercentComplete}%` } as React.CSSProperties}
            onChange={(e) => handlePercentChange(Number(e.target.value))}
            className="w-full"
          />
          <div className="mt-1 flex justify-between">
            <span className="text-surface-500 text-xs">0%</span>
            <span className="text-surface-500 text-xs">100%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
