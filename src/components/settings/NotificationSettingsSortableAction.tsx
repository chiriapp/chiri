import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import GripVertical from 'lucide-react/icons/grip-vertical';
import type { CSSProperties, ReactNode } from 'react';
import type { NotificationActionKey, SnoozeDuration } from '$types/settings';

export type NotificationActionConfig = {
  key: NotificationActionKey;
  label: string;
  description: string;
  icon: ReactNode;
};

interface NotificationSettingsSortableActionProps {
  action: NotificationActionConfig;
  showBorder: boolean;
  checked: boolean;
  disabled?: boolean;
  isOverlay?: boolean;
  snoozeDurations?: SnoozeDuration[];
  onToggle: (key: NotificationActionKey, value: boolean) => void;
  onSnoozeDurationsChange?: (durations: SnoozeDuration[]) => void;
}

export const NotificationSettingsSortableAction = ({
  action,
  showBorder,
  checked,
  disabled = false,
  isOverlay = false,
  snoozeDurations,
  onToggle,
  onSnoozeDurationsChange,
}: NotificationSettingsSortableActionProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: action.key,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 1 : undefined,
  };

  const isSnooze = action.key === 'snooze';

  const updateSnoozeDuration = (id: string, minutes: number) => {
    if (!snoozeDurations) return;
    const next = snoozeDurations.map((duration) =>
      duration.id === id ? { ...duration, minutes } : duration,
    );
    onSnoozeDurationsChange?.(next);
  };

  const removeSnoozeDuration = (id: string) => {
    if (!snoozeDurations || snoozeDurations.length <= 1) return;
    const next = snoozeDurations.filter((duration) => duration.id !== id);
    onSnoozeDurationsChange?.(next);
  };

  const addSnoozeDuration = () => {
    const next = snoozeDurations ? [...snoozeDurations] : [];
    const last = next[next.length - 1];
    const minutes = last ? last.minutes * 2 : 15;
    onSnoozeDurationsChange?.([...next, { id: crypto.randomUUID(), minutes }]);
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white dark:bg-surface-800">
      {showBorder && <div className="border-surface-200 border-t dark:border-surface-700" />}
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="shrink-0 cursor-grab rounded-sm text-surface-400 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 active:cursor-grabbing dark:text-surface-500"
            aria-label={`Reorder ${action.label}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="shrink-0 text-surface-400 dark:text-surface-500">{action.icon}</span>
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">{action.label}</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">{action.description}</p>
          </div>
        </div>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(action.key, e.target.checked)}
          disabled={disabled}
          className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed"
        />
      </div>
      {isSnooze && checked && !isOverlay && (
        <div className="px-4 pb-3">
          <div className="border-surface-200 border-l-2 pl-4 dark:border-surface-600">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-surface-700 dark:text-surface-300">Snooze durations</p>
                  <p className="text-surface-500 text-xs dark:text-surface-400">
                    Remind again after each duration
                  </p>
                </div>
              </div>
              {snoozeDurations?.map((duration) => (
                <div key={duration.id} className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={duration.minutes}
                      onChange={(e) => {
                        const parsed = parseInt(e.target.value, 10);
                        updateSnoozeDuration(
                          duration.id,
                          Number.isInteger(parsed) && parsed > 0 ? parsed : 15,
                        );
                      }}
                      disabled={disabled}
                      className="w-20 shrink-0 rounded-lg border border-surface-200 bg-surface-50 px-3 py-1.5 text-sm text-surface-800 outline-none transition-colors focus:border-primary-500 focus:bg-white disabled:cursor-not-allowed dark:border-surface-600 dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
                    />
                    <span className="text-sm text-surface-600 dark:text-surface-400">min</span>
                  </label>
                  {snoozeDurations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSnoozeDuration(duration.id)}
                      disabled={disabled}
                      className="text-sm text-surface-500 hover:text-red-500 disabled:cursor-not-allowed dark:text-surface-400 dark:hover:text-red-400"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addSnoozeDuration}
                disabled={disabled}
                className="text-primary-600 text-sm hover:text-primary-700 disabled:cursor-not-allowed dark:text-primary-400 dark:hover:text-primary-300"
              >
                + Add duration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
