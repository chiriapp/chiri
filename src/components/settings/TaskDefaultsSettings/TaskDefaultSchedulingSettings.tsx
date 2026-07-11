import BellRing from 'lucide-react/icons/bell-ring';
import Plus from 'lucide-react/icons/plus';
import Repeat from 'lucide-react/icons/repeat';
import X from 'lucide-react/icons/x';
import { useState } from 'react';
import { RepeatModal } from '$components/modals/RepeatModal/RepeatModal';
import { TaskDefaultsReminderPickerModal } from '$components/modals/TaskDefaultsReminderPickerModal';
import { TimePickerModal } from '$components/modals/TimePickerModal';
import { Select } from '$components/Select';
import { useSettingsStore } from '$context/settingsContext';
import type { DefaultReminderOffset } from '$types';
import { rruleToText } from '$utils/recurrence';

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

const DUE_DATE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: '1week', label: 'In 1 week' },
  { value: '2weeks', label: 'In 2 weeks' },
] as const;

const START_DATE_OPTION_GROUPS = [
  {
    label: 'Relative to today',
    options: [
      { value: 'today', label: 'Today' },
      { value: 'tomorrow', label: 'Tomorrow' },
      { value: '1week', label: 'In 1 week' },
      { value: '2weeks', label: 'In 2 weeks' },
    ],
  },
  {
    label: 'Relative to due date',
    options: [
      { value: 'due-date', label: 'Due date' },
      { value: 'due-time', label: 'Due time' },
      { value: '1day-before-due', label: 'Day before due' },
      { value: '1week-before-due', label: 'Week before due' },
    ],
  },
] as const;

const formatHour = (hour: number, use24h: boolean) => {
  if (use24h) return `${String(hour).padStart(2, '0')}:00`;
  if (hour === 0) return '12:00 AM';
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return '12:00 PM';
  return `${hour - 12}:00 PM`;
};

export const TaskDefaultSchedulingSettings = () => {
  const {
    defaultStartDate,
    setDefaultStartDate,
    defaultDueDate,
    setDefaultDueDate,
    defaultReminders,
    setDefaultReminders,
    defaultRrule,
    setDefaultRrule,
    defaultRepeatFrom,
    setDefaultRepeatFrom,
    dateFormat,
    defaultAllDayReminderHour,
    setDefaultAllDayReminderHour,
    allDayReminderNotificationsEnabled,
    setAllDayReminderNotificationsEnabled,
    timeFormat,
  } = useSettingsStore();
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [editingReminderOffset, setEditingReminderOffset] = useState<DefaultReminderOffset | null>(
    null,
  );
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [allDayReminderModalOpen, setAllDayReminderModalOpen] = useState(false);

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

  const selectClassName =
    'w-[160px] text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors shrink-0';
  const use24h = timeFormat === '24';

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">Scheduling</h4>
      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="flex items-center justify-between gap-4 p-4">
          <p className="text-sm text-surface-700 dark:text-surface-300">Start date</p>
          <Select
            value={defaultStartDate}
            onChange={(e) => setDefaultStartDate(e.target.value as typeof defaultStartDate)}
            className={selectClassName}
          >
            <option value="none">None</option>
            {START_DATE_OPTION_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </div>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <div className="flex items-center justify-between gap-4 p-4">
          <p className="text-sm text-surface-700 dark:text-surface-300">Due date</p>
          <Select
            value={defaultDueDate}
            onChange={(e) => setDefaultDueDate(e.target.value as typeof defaultDueDate)}
            className={selectClassName}
          >
            {DUE_DATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <div className="p-4">
          <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">Repeat</p>
          <button
            type="button"
            onClick={() => setShowRepeatModal(true)}
            className="flex w-full items-center gap-2 rounded-lg bg-surface-100 px-3 py-2 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-700 dark:hover:bg-surface-600"
          >
            <Repeat className="h-4 w-4 shrink-0 text-surface-400" />
            <span className="flex-1 text-left text-sm text-surface-700 dark:text-surface-300">
              {defaultRrule
                ? rruleToText(defaultRrule, defaultRepeatFrom, dateFormat)
                : 'Does not repeat'}
            </span>
          </button>
        </div>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <div className="p-4">
          <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">
            Reminders
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

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              All-day reminder notifications
            </p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Add default reminders to all-day tasks
            </p>
          </div>
          <input
            type="checkbox"
            checked={allDayReminderNotificationsEnabled}
            onChange={(e) => setAllDayReminderNotificationsEnabled(e.target.checked)}
            className="rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
        </label>

        {allDayReminderNotificationsEnabled && (
          <div className="px-4 pb-4">
            <div className="space-y-3 border-surface-200 border-l-2 pl-4 dark:border-surface-600">
              <div className="flex items-center justify-between">
                <p className="text-sm text-surface-600 dark:text-surface-400">Notification time</p>
                <button
                  type="button"
                  onClick={() => setAllDayReminderModalOpen(true)}
                  className="shrink-0 rounded-lg border border-transparent bg-surface-100 px-3 py-1 text-sm text-surface-800 outline-hidden transition-colors hover:bg-surface-200 focus:border-primary-500 focus:bg-white dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800 dark:hover:bg-surface-600"
                >
                  {formatHour(defaultAllDayReminderHour, use24h)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <TimePickerModal
        isOpen={allDayReminderModalOpen}
        onClose={() => setAllDayReminderModalOpen(false)}
        onConfirm={(hour, _minute) => {
          setDefaultAllDayReminderHour(hour);
          setAllDayReminderModalOpen(false);
        }}
        initialHour={defaultAllDayReminderHour}
        initialMinute={0}
        title="All-day reminder time"
        description="Default time for all-day task reminders"
      />

      {showReminderPicker && (
        <TaskDefaultsReminderPickerModal
          available={reminderOptionsForPicker}
          onSelect={handleSelectReminder}
          onClose={handleCloseReminderPicker}
          editing={editingReminderOffset ?? undefined}
        />
      )}

      {showRepeatModal && (
        <RepeatModal
          isOpen={showRepeatModal}
          onClose={() => setShowRepeatModal(false)}
          rrule={defaultRrule}
          repeatFrom={defaultRepeatFrom}
          dueDate={undefined}
          onSave={(rrule, repeatFrom) => {
            setDefaultRrule(rrule);
            setDefaultRepeatFrom(repeatFrom);
          }}
        />
      )}
    </div>
  );
};
