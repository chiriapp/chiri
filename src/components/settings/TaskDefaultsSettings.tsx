import Ban from 'lucide-react/icons/ban';
import BellRing from 'lucide-react/icons/bell-ring';
import Check from 'lucide-react/icons/check';
import Loader from 'lucide-react/icons/loader';
import Plus from 'lucide-react/icons/plus';
import Repeat from 'lucide-react/icons/repeat';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import X from 'lucide-react/icons/x';
import { useState } from 'react';
import { AppSelect } from '$components/AppSelect';
import { RepeatModal } from '$components/modals/RepeatModal';
import { TagModal } from '$components/modals/TagModal';
import { TagPickerModal } from '$components/modals/TagPickerModal';
import { TaskDefaultsColorPickerSection } from '$components/settings/TaskDefaultsColorPickerSection';
import { TaskDefaultsReminderPickerModal } from '$components/settings/TaskDefaultsReminderPickerModal';
import { getIconByName } from '$constants/icons';
import { PRIORITIES } from '$constants/priority';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useTags } from '$hooks/queries/useTags';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { useColorPresets } from '$hooks/ui/useColorPresets';
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
    accentColor,
    defaultTags,
    setDefaultTags,
    defaultCalendarId,
    setDefaultCalendarId,
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
  const { data: accounts = [] } = useAccounts();
  const { data: tags = [] } = useTags();
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [createTagName, setCreateTagName] = useState<string | null>(null);
  const [tagPickerInitialQuery, setTagPickerInitialQuery] = useState('');
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

  const handleAddTag = (tagId: string) => {
    if (!defaultTags.includes(tagId)) {
      setDefaultTags([...defaultTags, tagId]);
    }
  };

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
  const availableTags = tags.filter((t) => !defaultTags.includes(t.id));

  const selectClassName =
    'w-[160px] text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors shrink-0';

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">
        Task Defaults
      </h3>

      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <div className="p-4">
          <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">Status</p>
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
                  Icon: Loader,
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
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${
                  defaultStatus === value
                    ? activeClass
                    : 'border-surface-200 dark:border-surface-600 hover:border-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${defaultStatus === value ? iconClass : ''}`} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Progress</p>
            <span className="text-xs font-medium text-surface-600 dark:text-surface-400">
              {defaultPercentComplete}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={defaultPercentComplete}
            style={{ '--pct': `${defaultPercentComplete}%` } as React.CSSProperties}
            onChange={(e) => setDefaultPercentComplete(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-surface-400">0%</span>
            <span className="text-xs text-surface-400">100%</span>
          </div>
        </div>

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <div className="p-4">
          <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
            Priority
          </p>
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                type="button"
                key={p.value}
                onClick={() => setDefaultPriority(p.value)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${
                  defaultPriority === p.value
                    ? `${p.borderColor} bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100`
                    : 'border-surface-200 dark:border-surface-600 hover:border-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400'
                }`}
              >
                <span className={p.color}>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Default calendar</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Applied when creating a new task
            </p>
          </div>
          <AppSelect
            value={defaultCalendarId || ''}
            onChange={(e) => setDefaultCalendarId(e.target.value || null)}
            disabled={
              accounts.length === 0 || !accounts.some((account) => account.calendars.length > 0)
            }
            className="max-w-50 text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accounts.length === 0 || !accounts.some((account) => account.calendars.length > 0) ? (
              <option value="">No accounts available</option>
            ) : (
              <>
                <option value="">Use active calendar</option>
                {accounts.map((account) => (
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
          </AppSelect>
        </div>

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <TaskDefaultsColorPickerSection
          label="Default calendar color"
          value={defaultCalendarColor}
          onChange={setDefaultCalendarColor}
          presets={colorPresets}
          accentColor={accentColor}
        />

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <div className="flex items-center justify-between gap-4 p-4">
          <p className="text-sm text-surface-700 dark:text-surface-300">Start date</p>
          <AppSelect
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
          </AppSelect>
        </div>

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <div className="flex items-center justify-between gap-4 p-4">
          <p className="text-sm text-surface-700 dark:text-surface-300">Due date</p>
          <AppSelect
            value={defaultDueDate}
            onChange={(e) => setDefaultDueDate(e.target.value as typeof defaultDueDate)}
            className={selectClassName}
          >
            {DUE_DATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </AppSelect>
        </div>
      </div>

      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <div className="p-4">
          <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">Repeat</p>
          <button
            type="button"
            onClick={() => setShowRepeatModal(true)}
            className="flex items-center gap-2 px-3 py-2 w-full bg-surface-100 dark:bg-surface-700 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <Repeat className="w-4 h-4 text-surface-400 shrink-0" />
            <span className="flex-1 text-left text-sm text-surface-700 dark:text-surface-300">
              {defaultRrule
                ? rruleToText(defaultRrule, defaultRepeatFrom, dateFormat)
                : 'Does not repeat'}
            </span>
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <TaskDefaultsColorPickerSection
          label="Default tag color"
          value={defaultTagColor}
          onChange={setDefaultTagColor}
          presets={colorPresets}
          accentColor={accentColor}
        />

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <div className="p-4">
          <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">Tags</p>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => {
              if (!tag) return null;
              const TagIcon = getIconByName(tag.icon || 'tag');
              return (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-sm border text-xs font-medium group"
                  style={{
                    borderColor: tag.color,
                    backgroundColor: `${tag.color}15`,
                    color: tag.color,
                  }}
                >
                  {tag.emoji ? (
                    <span className="text-sm">{tag.emoji}</span>
                  ) : (
                    <TagIcon className="w-3 h-3" />
                  )}
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag.id)}
                    className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              onClick={() => setShowTagPicker(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-surface-50 dark:bg-surface-800 text-surface-500 dark:text-surface-400 border border-surface-200 dark:border-surface-600 rounded-sm hover:border-surface-400 dark:hover:border-surface-500 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              <Plus className="w-3 h-3" />
              Add tag
            </button>
          </div>
        </div>

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <div className="p-4">
          <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
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
                className="flex items-center gap-2 px-3 py-2 bg-surface-100 dark:bg-surface-700 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors cursor-pointer group outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                <BellRing className="w-4 h-4 text-surface-400 shrink-0" />
                <span className="flex-1 text-sm text-surface-700 dark:text-surface-300">
                  {REMINDER_LABELS[offset]}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveReminder(offset);
                  }}
                  className="p-1 text-surface-400 hover:text-semantic-error hover:bg-surface-100 dark:hover:bg-surface-800 rounded-full invisible group-hover:visible focus-visible:visible outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                  title="Remove reminder"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          {availableReminderOptions.length > 0 && (
            <button
              type="button"
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs bg-surface-50 dark:bg-surface-800 text-surface-500 dark:text-surface-400 border border-surface-200 dark:border-surface-600 rounded-sm hover:border-surface-400 dark:hover:border-surface-500 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${defaultReminders.length > 0 ? 'mt-3' : ''}`}
              onClick={() => {
                setEditingReminderOffset(null);
                setShowReminderPicker(true);
              }}
            >
              <Plus className="w-3 h-3" />
              Add reminder
            </button>
          )}
        </div>
      </div>

      {showTagPicker && (
        <TagPickerModal
          isOpen={showTagPicker}
          onClose={() => setShowTagPicker(false)}
          availableTags={availableTags}
          onSelectTag={handleAddTag}
          onCreateTag={(name) => {
            setTagPickerInitialQuery(name);
            setShowTagPicker(false);
            setCreateTagName(name);
          }}
          allTagsAssigned={availableTags.length === 0 && tags.length > 0}
          noTagsExist={tags.length === 0}
          initialQuery={tagPickerInitialQuery}
        />
      )}

      {createTagName !== null && (
        <TagModal
          tagId={null}
          initialName={createTagName}
          onClose={() => {
            setCreateTagName(null);
            setShowTagPicker(true);
          }}
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
