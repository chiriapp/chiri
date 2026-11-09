import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type Modifier,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import GripVertical from 'lucide-react/icons/grip-vertical';
import TriangleAlert from 'lucide-react/icons/triangle-alert';
import { type CSSProperties, type ReactNode, useCallback, useRef } from 'react';
import { NotificationSettingsSnoozeDuration } from '$components/settings/NotificationSettings/NotificationSettingsSnoozeDuration';
import { MAX_NOTIFICATION_ACTIONS } from '$constants';
import { clampSnoozeDurationValue } from '$lib/notifications/duration';
import type { NotificationActionKey, SnoozeDuration } from '$types/notifications/settings';

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
  complete: boolean;
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
  complete,
  disabled = false,
  isOverlay = false,
  snoozeDurations,
  onToggle,
  onSnoozeDurationsChange,
}: NotificationSettingsSortableActionProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: action.key,
    disabled,
  });
  const snoozeDurationDragBoundsRef = useRef<HTMLDivElement>(null);

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 1 : undefined,
  };

  const isSnooze = action.key === 'snooze';
  const toggleId = `notification-action-${action.key}-${isOverlay ? 'overlay' : 'setting'}`;

  const updateSnoozeDuration = (id: string, value: number, unit: SnoozeDuration['unit']) => {
    if (!snoozeDurations) return;
    const next = snoozeDurations.map((duration) =>
      duration.id === id
        ? { ...duration, value: clampSnoozeDurationValue(value, unit), unit }
        : duration,
    );
    onSnoozeDurationsChange?.(next);
  };

  const removeSnoozeDuration = (id: string) => {
    if (!snoozeDurations) return;
    const next = snoozeDurations.filter((duration) => duration.id !== id);
    onSnoozeDurationsChange?.(next);
  };

  const maxSnoozeDurations = complete ? MAX_NOTIFICATION_ACTIONS - 1 : MAX_NOTIFICATION_ACTIONS;
  const canAddSnoozeDuration = !snoozeDurations || snoozeDurations.length < maxSnoozeDurations;
  const snoozeDurationSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleSnoozeDurationDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || !snoozeDurations) return;
    const oldIndex = snoozeDurations.findIndex((duration) => duration.id === active.id);
    const newIndex = snoozeDurations.findIndex((duration) => duration.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onSnoozeDurationsChange?.(arrayMove(snoozeDurations, oldIndex, newIndex));
  };

  const restrictSnoozeDurationDragToSection = useCallback<Modifier>(
    ({ draggingNodeRect, transform }) => {
      const bounds = snoozeDurationDragBoundsRef.current?.getBoundingClientRect();
      if (!bounds || !draggingNodeRect) return transform;

      return {
        ...transform,
        x: Math.min(
          Math.max(transform.x, bounds.left - draggingNodeRect.left),
          bounds.right - draggingNodeRect.right,
        ),
        y: Math.min(
          Math.max(transform.y, bounds.top - draggingNodeRect.top),
          bounds.bottom - draggingNodeRect.bottom,
        ),
      };
    },
    [],
  );

  const addSnoozeDuration = () => {
    if (!canAddSnoozeDuration) return;
    const next = snoozeDurations ? [...snoozeDurations] : [];
    const last = next[next.length - 1];
    const value = last ? clampSnoozeDurationValue(last.value * 2, last.unit) : 15;
    const unit = last?.unit ?? 'minutes';
    onSnoozeDurationsChange?.([...next, { id: crypto.randomUUID(), value, unit }]);
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white dark:bg-surface-800">
      {showBorder && <div className="border-surface-300 border-t dark:border-surface-700" />}
      <div className="flex items-center justify-between gap-4 p-4">
        <button
          type="button"
          disabled={disabled}
          className={`shrink-0 rounded-sm text-surface-500 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-ink dark:text-surface-500 ${disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
          aria-label={`Reorder ${action.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <label
          htmlFor={toggleId}
          className={`flex min-w-0 flex-1 items-center gap-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span className="shrink-0 text-surface-500 dark:text-surface-500">{action.icon}</span>
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">{action.label}</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">{action.description}</p>
          </div>
        </label>
        <input
          id={toggleId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(action.key, e.target.checked)}
          disabled={disabled}
          className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-ink focus:ring-offset-2 disabled:cursor-not-allowed"
        />
      </div>
      {isSnooze && checked && !isOverlay && (
        <div className="px-4 pb-3">
          <div className="border-surface-300 border-l-2 pl-4 dark:border-surface-600">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-surface-700 dark:text-surface-300">Snooze durations</p>
                  <p className="text-surface-500 text-xs dark:text-surface-400">
                    Remind again after each duration. Each duration can be up to 1 year.
                  </p>
                </div>
              </div>
              {snoozeDurations?.length === 0 && (
                <div className="flex gap-2 rounded-lg border border-semantic-warning/30 bg-semantic-warning/10 px-3 py-2 text-surface-700 text-xs dark:text-surface-300">
                  <TriangleAlert className="mt-px size-3.5 shrink-0 text-semantic-warning" />
                  <span>
                    Snooze is disabled as a notification action until you add at least one duration.
                  </span>
                </div>
              )}
              <DndContext
                sensors={snoozeDurationSensors}
                collisionDetection={closestCenter}
                modifiers={[restrictSnoozeDurationDragToSection]}
                onDragEnd={handleSnoozeDurationDragEnd}
              >
                <div ref={snoozeDurationDragBoundsRef} className="space-y-2">
                  <SortableContext
                    items={snoozeDurations?.map((duration) => duration.id) ?? []}
                    strategy={verticalListSortingStrategy}
                  >
                    {snoozeDurations?.map((duration) => (
                      <NotificationSettingsSnoozeDuration
                        key={duration.id}
                        duration={duration}
                        disabled={disabled}
                        onChange={updateSnoozeDuration}
                        onRemove={removeSnoozeDuration}
                      />
                    ))}
                  </SortableContext>
                </div>
              </DndContext>
              <button
                type="button"
                onClick={addSnoozeDuration}
                disabled={disabled || !canAddSnoozeDuration}
                className="text-primary-ink text-sm hover:text-primary-ink disabled:cursor-not-allowed dark:text-primary-400 dark:hover:text-primary-300"
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
