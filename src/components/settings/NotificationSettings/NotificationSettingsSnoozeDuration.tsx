import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import GripVertical from 'lucide-react/icons/grip-vertical';
import X from 'lucide-react/icons/x';
import type { CSSProperties } from 'react';
import { Select } from '$components/Select';
import { getMaxSnoozeDurationValue, SNOOZE_DURATION_UNITS } from '$lib/notifications/duration';
import type { SnoozeDuration } from '$types/notifications/settings';

interface NotificationSettingsSnoozeDurationProps {
  duration: SnoozeDuration;
  disabled: boolean;
  onChange: (id: string, value: number, unit: SnoozeDuration['unit']) => void;
  onRemove: (id: string) => void;
}

export const NotificationSettingsSnoozeDuration = ({
  duration,
  disabled,
  onChange,
  onRemove,
}: NotificationSettingsSnoozeDurationProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: duration.id,
    disabled,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          className={`shrink-0 rounded-sm text-surface-500 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-ink dark:text-surface-400 ${disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
          aria-label={`Reorder snooze duration ${duration.value} ${duration.unit}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <label className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={getMaxSnoozeDurationValue(duration.unit)}
            value={duration.value}
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 10);
              onChange(
                duration.id,
                Number.isInteger(parsed) && parsed > 0 ? parsed : 1,
                duration.unit,
              );
            }}
            disabled={disabled}
            className="w-20 shrink-0 rounded-lg border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-800 outline-none transition-colors focus:border-primary-ink focus:bg-white disabled:cursor-not-allowed dark:border-surface-600 dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
          />
          <Select
            value={duration.unit}
            onChange={(e) =>
              onChange(duration.id, duration.value, e.target.value as SnoozeDuration['unit'])
            }
            disabled={disabled}
            className="shrink-0 rounded-lg border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-800 outline-none transition-colors focus:border-primary-ink focus:bg-white disabled:cursor-not-allowed dark:border-surface-600 dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
          >
            {SNOOZE_DURATION_UNITS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <button
        type="button"
        onClick={() => onRemove(duration.id)}
        disabled={disabled}
        title={`Remove ${duration.value} ${duration.unit} snooze duration`}
        aria-label={`Remove snooze duration ${duration.value} ${duration.unit}`}
        className="shrink-0 rounded-full p-1 text-surface-500 outline-hidden transition-colors hover:bg-surface-100 hover:text-semantic-error focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-semantic-error"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
