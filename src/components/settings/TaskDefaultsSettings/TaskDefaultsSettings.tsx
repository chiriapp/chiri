import Ban from 'lucide-react/icons/ban';
import BellRing from 'lucide-react/icons/bell-ring';
import Check from 'lucide-react/icons/check';
import Plus from 'lucide-react/icons/plus';
import Repeat from 'lucide-react/icons/repeat';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import Timer from 'lucide-react/icons/timer';
import X from 'lucide-react/icons/x';
import { type CSSProperties, useState } from 'react';
import { BatchTaskTagsModal } from '$components/modals/BatchTaskTagsModal';
import { RepeatModal } from '$components/modals/RepeatModal/RepeatModal';
import { TaskDefaultsReminderPickerModal } from '$components/modals/TaskDefaultsReminderPickerModal';
import { Select } from '$components/Select';
import { TaskDefaultsColorPicker } from '$components/settings/TaskDefaultsSettings/TaskDefaultsColorPicker';
import { getIconByName } from '$constants/icons';
import { PRIORITIES } from '$constants/priority';
import { useSettingsStore } from '$context/settingsContext';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useTags } from '$hooks/queries/useTags';
import { useColorPresets } from '$hooks/ui/useColorPresets';
import { useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import type { DefaultReminderOffset, TaskStatus } from '$types';
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

export const TaskDefaultsSettings = () => {
  const {
    defaultPriority,
    setDefaultPriority,
    defaultStatus,
    setDefaultStatus,
    defaultPercentComplete,
    setDefaultPercentComplete,
    defaultTags,
    setDefaultTags,
    defaultCalendarId,
    setDefaultCalendarId,
    preferCalDAVCalendarForNewTasks,
    setPreferCalDAVCalendarForNewTasks,
    defaultCalendarColor,
    setDefaultCalendarColor,
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
    defaultTagColor,
    setDefaultTagColor,
  } = useSettingsStore();
  const colorPresets = useColorPresets();
  const resolvedAccentColor = useResolvedAccentColor();
  const { data: accounts = [] } = useAccounts();
  const { data: tags = [] } = useTags();
  const accountsWithCalendars = accounts.filter((account) => account.calendars.length > 0);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [editingReminderOffset, setEditingReminderOffset] = useState<DefaultReminderOffset | null>(
    null,
  );
  const [showRepeatModal, setShowRepeatModal] = useState(false);

  const availableReminderOptions = REMINDER_OPTIONS.filter(
    (o) => !defaultReminders.includes(o.value),
  );

  const reminderOptionsForPicker =
    editingReminderOffset !== null
      ? REMINDER_OPTIONS.filter(
          (o) => !defaultReminders.includes(o.value) || o.value === editingReminderOffset,
        )
      : availableReminderOptions;

  const handleRemoveTag = (tagId: string) => {
    setDefaultTags(defaultTags.filter((id) => id !== tagId));
  };

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

  const selectedTags = defaultTags.map((tagId) => tags.find((t) => t.id === tagId)).filter(Boolean);

  const selectClassName =
    'w-[160px] text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors shrink-0';

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">Defaults</h3>

      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">
          Task values
        </h4>
        <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
          <div className="p-4">
            <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">
              Status
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    value: 'needs-action',
                    label: 'Needs Action',
                    Icon: RotateCcw,
                    iconClass: 'text-status-needs-action',
                    activeClass:
                      'border-status-needs-action bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100',
                  },
                  {
                    value: 'in-process',
                    label: 'In Process',
                    Icon: Timer,
                    iconClass: 'text-status-in-process',
                    activeClass:
                      'border-status-in-process bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100',
                  },
                  {
                    value: 'completed',
                    label: 'Completed',
                    Icon: Check,
                    iconClass: 'text-status-completed',
                    activeClass:
                      'border-status-completed bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100',
                  },
                  {
                    value: 'cancelled',
                    label: 'Cancelled',
                    Icon: Ban,
                    iconClass: 'text-status-cancelled',
                    activeClass:
                      'border-status-cancelled bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100',
                  },
                ] as const
              ).map(({ value, label, Icon, iconClass, activeClass }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDefaultStatus(value as TaskStatus)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-medium text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                    defaultStatus === value
                      ? activeClass
                      : 'border-surface-200 text-surface-600 hover:border-surface-300 hover:bg-surface-50 dark:border-surface-600 dark:text-surface-400 dark:hover:bg-surface-700'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${defaultStatus === value ? iconClass : ''}`}
                  />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-surface-200 border-t dark:border-surface-700" />

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
              step={5}
              value={defaultPercentComplete}
              style={{ '--pct': `${defaultPercentComplete}%` } as CSSProperties}
              onChange={(e) => setDefaultPercentComplete(Number(e.target.value))}
              className="w-full"
            />
            <div className="mt-1 flex justify-between">
              <span className="text-surface-400 text-xs">0%</span>
              <span className="text-surface-400 text-xs">100%</span>
            </div>
          </div>

          <div className="border-surface-200 border-t dark:border-surface-700" />

          <div className="p-4">
            <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">
              Priority
            </p>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p.value}
                  onClick={() => setDefaultPriority(p.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 font-medium text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                    defaultPriority === p.value
                      ? `${p.borderColor} bg-surface-200 text-surface-900 dark:bg-surface-700 dark:text-surface-100`
                      : 'border-surface-200 text-surface-600 hover:border-surface-300 hover:bg-surface-50 dark:border-surface-600 dark:text-surface-400 dark:hover:bg-surface-700'
                  }`}
                >
                  <span className={p.color}>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">New tasks</h4>
        <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
          <div className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm text-surface-700 dark:text-surface-300">Default calendar</p>
              <p className="text-surface-500 text-xs dark:text-surface-400">
                Applied when creating a new task
              </p>
            </div>
            <Select
              value={defaultCalendarId || ''}
              onChange={(e) => setDefaultCalendarId(e.target.value || null)}
              disabled={accountsWithCalendars.length === 0}
              className="max-w-50 shrink-0 rounded-lg border border-transparent bg-surface-100 text-sm text-surface-800 outline-hidden transition-colors focus:border-primary-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
            >
              {accountsWithCalendars.length === 0 ? (
                <option value="">No accounts available</option>
              ) : (
                <>
                  <option value="">Use first calendar</option>
                  {accountsWithCalendars.map((account) => (
                    <optgroup key={account.id} label={account.name}>
                      {account.calendars.map((cal) => (
                        <option key={cal.id} value={cal.id}>
                          {cal.displayName}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </>
              )}
            </Select>
          </div>

          {!defaultCalendarId && (
            <div className="px-4 pb-4">
              <div className="border-surface-200 border-l-2 pl-4 dark:border-surface-600">
                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-surface-700 dark:text-surface-300">Prefer CalDAV</p>
                    <p className="text-surface-500 text-xs dark:text-surface-400">
                      When added, prefer using a remote calendar instead of local
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferCalDAVCalendarForNewTasks}
                    onChange={(e) => setPreferCalDAVCalendarForNewTasks(e.target.checked)}
                    className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  />
                </label>
              </div>
            </div>
          )}

          <div className="border-surface-200 border-t dark:border-surface-700" />

          <div className="p-4">
            <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">
              Default tags
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {selectedTags.map((tag) => {
                if (!tag) return null;
                const TagIcon = getIconByName(tag.icon || 'tag');
                return (
                  <span
                    key={tag.id}
                    className="group inline-flex items-center gap-1.5 rounded-sm border py-1 pr-1 pl-2 font-medium text-xs leading-none"
                    style={{
                      borderColor: tag.color,
                      backgroundColor: `${tag.color}15`,
                      color: tag.color,
                    }}
                  >
                    {tag.emoji ? (
                      <span className="text-sm">{tag.emoji}</span>
                    ) : (
                      <TagIcon className="h-3 w-3" />
                    )}
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag.id)}
                      className="rounded-full p-0.5 outline-hidden transition-colors hover:bg-black/10 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:hover:bg-white/10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                onClick={() => setShowTagsModal(true)}
                className="inline-flex items-center gap-1 rounded-sm border border-surface-200 bg-surface-50 px-2.5 py-1.5 text-surface-500 text-xs leading-none outline-hidden transition-colors hover:border-surface-400 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:border-surface-600 dark:bg-surface-800 dark:text-surface-400 dark:hover:border-surface-500"
              >
                <Plus className="h-3 w-3" />
                Add tag
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">
          Dates & recurrence
        </h4>
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
            <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">
              Repeat
            </p>
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
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">
          New item colors
        </h4>
        <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
          <TaskDefaultsColorPicker
            label="Default tag color"
            value={defaultTagColor}
            onChange={setDefaultTagColor}
            presets={colorPresets}
            accentColor={resolvedAccentColor}
          />

          <div className="border-surface-200 border-t dark:border-surface-700" />

          <TaskDefaultsColorPicker
            label="Default calendar color"
            value={defaultCalendarColor}
            onChange={setDefaultCalendarColor}
            presets={colorPresets}
            accentColor={resolvedAccentColor}
          />
        </div>
      </div>

      {showTagsModal && (
        <BatchTaskTagsModal
          isOpen={showTagsModal}
          onClose={() => setShowTagsModal(false)}
          tags={tags}
          selectedTagIds={defaultTags}
          onSelectedTagIdsChange={setDefaultTags}
          title="Default Tags"
          description="Applied to new tasks"
        />
      )}

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
