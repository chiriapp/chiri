import BellRing from 'lucide-react/icons/bell-ring';
import Plus from 'lucide-react/icons/plus';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import X from 'lucide-react/icons/x';
import { useState } from 'react';
import { TaskDefaultsReminderPickerModal } from '$components/modals/TaskDefaultsReminderPickerModal';
import { useSettingsStore } from '$context/settingsContext';
import { defaultState } from '$context/settingsDefaults';
import type { DefaultReminderOffset } from '$types';

const REMINDER_OPTIONS: { value: DefaultReminderOffset; label: string }[] = [
  { value: 'at-due', label: 'At due time' },
  { value: '5min-before-due', label: '5 minutes before due' },
  { value: '15min-before-due', label: '15 minutes before due' },
  { value: '30min-before-due', label: '30 minutes before due' },
  { value: '1hr-before-due', label: '1 hour before due' },
  { value: '2hr-before-due', label: '2 hours before due' },
  { value: '1day-before-due', label: '1 day before due' },
  { value: '2days-before-due', label: '2 days before due' },
  { value: '1week-before-due', label: '1 week before due' },
];

const REMINDER_LABELS = Object.fromEntries(
  REMINDER_OPTIONS.map((o) => [o.value, o.label]),
) as Record<DefaultReminderOffset, string>;

export const TaskDefaultsRemindersSection = () => {
  const { defaultReminders, setDefaultReminders } = useSettingsStore();
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [editingReminderOffset, setEditingReminderOffset] = useState<DefaultReminderOffset | null>(
    null,
  );

  const availableReminderOptions = REMINDER_OPTIONS.filter(
    (o) => !defaultReminders.includes(o.value),
  );

  const reminderOptionsForPicker =
    editingReminderOffset !== null
      ? REMINDER_OPTIONS.filter(
          (o) => !defaultReminders.includes(o.value) || o.value === editingReminderOffset,
        )
      : availableReminderOptions;

  const handleSelectReminder = (offset: DefaultReminderOffset) => {
    if (editingReminderOffset !== null) {
      setDefaultReminders(defaultReminders.map((r) => (r === editingReminderOffset ? offset : r)));
    } else if (!defaultReminders.includes(offset)) {
      setDefaultReminders([...defaultReminders, offset]);
    }
  };

  const handleEditReminder = (offset: DefaultReminderOffset) => {
    setEditingReminderOffset(offset);
    setShowReminderPicker(true);
  };

  const handleRemoveReminder = (offset: DefaultReminderOffset) => {
    setDefaultReminders(defaultReminders.filter((r) => r !== offset));
  };

  const handleCloseReminderPicker = () => {
    setShowReminderPicker(false);
    setEditingReminderOffset(null);
  };

  const handleReset = () => {
    setDefaultReminders(defaultState.defaultReminders);
  };

  const hasChanged =
    defaultReminders.length !== defaultState.defaultReminders.length ||
    !defaultReminders.every((reminder) => defaultState.defaultReminders.includes(reminder));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">Reminders</h4>
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
        <div className="p-4">
          <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">
            Default reminders
          </p>
          <div className="space-y-1.5">
            {defaultReminders.map((offset) => (
              // biome-ignore lint/a11y/useSemanticElements: Using div with role=button to allow nested delete button without button nesting
              <div
                key={offset}
                role="button"
                tabIndex={0}
                onClick={() => handleEditReminder(offset)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleEditReminder(offset);
                  }
                }}
                className="group flex cursor-pointer items-center gap-2 rounded-lg bg-surface-100 px-3 py-2 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-700 dark:hover:bg-surface-600"
              >
                <BellRing className="h-4 w-4 shrink-0 text-surface-400" />
                <span className="flex-1 text-sm text-surface-700 dark:text-surface-300">
                  {REMINDER_LABELS[offset]}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveReminder(offset);
                  }}
                  className="invisible rounded-full p-1 text-surface-400 outline-hidden hover:bg-surface-100 hover:text-semantic-error focus-visible:visible focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset group-hover:visible dark:hover:bg-surface-800"
                  title="Remove reminder"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {availableReminderOptions.length > 0 && (
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-sm border border-surface-200 bg-surface-50 px-2.5 py-1.5 text-surface-500 text-xs leading-none outline-hidden transition-colors hover:border-surface-400 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:border-surface-600 dark:bg-surface-800 dark:text-surface-400 dark:hover:border-surface-500 ${defaultReminders.length > 0 ? 'mt-3' : ''}`}
              onClick={() => {
                setEditingReminderOffset(null);
                setShowReminderPicker(true);
              }}
            >
              <Plus className="h-3 w-3" />
              Add reminder
            </button>
          )}
        </div>
      </div>

      {showReminderPicker && (
        <TaskDefaultsReminderPickerModal
          available={reminderOptionsForPicker}
          onSelect={handleSelectReminder}
          onClose={handleCloseReminderPicker}
          editing={editingReminderOffset ?? undefined}
        />
      )}
    </div>
  );
};
