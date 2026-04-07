import Calendar from 'lucide-react/icons/calendar';
import CalendarPlus from 'lucide-react/icons/calendar-plus';
import X from 'lucide-react/icons/x';
import { useState } from 'react';
import { AppSelect } from '$components/AppSelect';
import { ModalBackdrop } from '$components/ModalBackdrop';
import { ModalButton } from '$components/ModalButton';
import { DatePickerModal } from '$components/modals/DatePickerModal';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { useFocusTrap } from '$hooks/ui/useFocusTrap';
import { useModalEscapeKey } from '$hooks/ui/useModalEscapeKey';
import { formatDate } from '$utils/date';
import {
  buildRRule,
  frequencyToRRule,
  parseRRule,
  type RecurrenceFrequency,
  rruleToFrequency,
} from '$utils/recurrence';

interface RepeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  rrule: string | undefined;
  repeatFrom: number;
  dueDate?: Date;
  onSave: (rrule: string | undefined, repeatFrom: number) => void;
}

type EndMode = 'never' | 'count' | 'until';
type CustomPeriod = 'MINUTELY' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

interface RepeatUIState {
  freq: RecurrenceFrequency;
  interval: number;
  byday: string[];
  customPeriod: CustomPeriod;
  endMode: EndMode;
  count: number;
  until: string; // YYYY-MM-DD for <input type="date">
}

const WEEKDAY_OPTIONS = [
  { value: 'MO', label: 'Mo' },
  { value: 'TU', label: 'Tu' },
  { value: 'WE', label: 'We' },
  { value: 'TH', label: 'Th' },
  { value: 'FR', label: 'Fr' },
  { value: 'SA', label: 'Sa' },
  { value: 'SU', label: 'Su' },
];

const CUSTOM_PERIOD_OPTIONS: { value: CustomPeriod; label: string; plural: string }[] = [
  { value: 'MINUTELY', label: 'minute', plural: 'minutes' },
  { value: 'HOURLY', label: 'hour', plural: 'hours' },
  { value: 'DAILY', label: 'day', plural: 'days' },
  { value: 'WEEKLY', label: 'week', plural: 'weeks' },
  { value: 'MONTHLY', label: 'month', plural: 'months' },
  { value: 'YEARLY', label: 'year', plural: 'years' },
];

const PRESET_PERIOD_LABEL: Partial<
  Record<RecurrenceFrequency, { singular: string; plural: string }>
> = {
  daily: { singular: 'day', plural: 'days' },
  weekly: { singular: 'week', plural: 'weeks' },
  monthly: { singular: 'month', plural: 'months' },
  yearly: { singular: 'year', plural: 'years' },
};

const parseToUIState = (rrule: string | undefined, dueDate?: Date): RepeatUIState => {
  const defaults: RepeatUIState = {
    freq: 'none',
    interval: 1,
    byday: [],
    customPeriod: 'DAILY',
    endMode: 'never',
    count: 5,
    until: dueDate
      ? new Date(new Date(dueDate).setFullYear(new Date(dueDate).getFullYear() + 1))
          .toISOString()
          .slice(0, 10)
      : '',
  };

  if (!rrule) return defaults;

  const parts = parseRRule(rrule);
  const freq = rruleToFrequency(rrule);
  const interval = parseInt(parts.INTERVAL ?? '1', 10);
  const byday = parts.BYDAY ? parts.BYDAY.split(',') : [];
  const endMode: EndMode = parts.COUNT ? 'count' : parts.UNTIL ? 'until' : 'never';
  const count = parts.COUNT ? parseInt(parts.COUNT, 10) : defaults.count;

  const freqToCustomPeriod: Record<string, CustomPeriod> = {
    MINUTELY: 'MINUTELY',
    HOURLY: 'HOURLY',
    DAILY: 'DAILY',
    WEEKLY: 'WEEKLY',
    MONTHLY: 'MONTHLY',
    YEARLY: 'YEARLY',
  };
  const customPeriod: CustomPeriod = freqToCustomPeriod[parts.FREQ ?? ''] ?? 'DAILY';

  let until = defaults.until;
  if (parts.UNTIL) {
    const u = parts.UNTIL;
    until = `${u.slice(0, 4)}-${u.slice(4, 6)}-${u.slice(6, 8)}`;
  }

  return { freq, interval, byday, customPeriod, endMode, count, until };
};

const buildFromUIState = (state: RepeatUIState) => {
  if (state.freq === 'none') return undefined;

  let base: Record<string, string>;

  if (state.freq === 'custom') {
    base = { FREQ: state.customPeriod };
    if (state.byday.length > 0 && state.customPeriod === 'WEEKLY') {
      base.BYDAY = state.byday.join(',');
    }
  } else {
    base = parseRRule(frequencyToRRule(state.freq));
  }

  if (state.interval > 1) base.INTERVAL = String(state.interval);

  if (state.endMode === 'count' && state.count > 0) {
    base.COUNT = String(state.count);
  } else if (state.endMode === 'until' && state.until) {
    base.UNTIL = `${state.until.replace(/-/g, '')}T000000Z`;
  }

  return buildRRule(base);
};

const inputCls =
  'h-9 px-3 py-2 text-sm bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg ' +
  'focus:outline-hidden focus:border-primary-300 dark:focus:border-primary-400 ' +
  'focus:bg-white dark:focus:bg-primary-900/30 transition-colors ' +
  'text-surface-800 dark:text-surface-200';

const selectCls =
  'h-9 text-sm border border-surface-200 dark:border-surface-600 bg-surface-100 dark:bg-surface-700 ' +
  'text-surface-800 dark:text-surface-200 rounded-lg focus:outline-hidden ' +
  'focus:border-primary-300 dark:focus:border-primary-400 ' +
  'focus:bg-white dark:focus:bg-primary-900/30 transition-colors';

const btnBase =
  'flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ' +
  'outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500';

const btnActive =
  'border-primary-400 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400';

const btnInactive =
  'border-surface-200 dark:border-surface-700 hover:border-surface-300 hover:bg-surface-50 ' +
  'dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400';

export const RepeatModal = ({
  isOpen,
  onClose,
  rrule,
  repeatFrom,
  dueDate,
  onSave,
}: RepeatModalProps) => {
  const [ui, setUI] = useState<RepeatUIState>(() => parseToUIState(rrule, dueDate));
  const [localRepeatFrom, setLocalRepeatFrom] = useState(repeatFrom);
  const [intervalInput, setIntervalInput] = useState(() =>
    String(parseToUIState(rrule, dueDate).interval),
  );
  const [countInput, setCountInput] = useState(() => String(parseToUIState(rrule, dueDate).count));
  const [showUntilPicker, setShowUntilPicker] = useState(false);

  const { dateFormat, startOfWeek } = useSettingsStore();

  // Reset local state whenever the modal opens
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      const parsed = parseToUIState(rrule, dueDate);
      setUI(parsed);
      setLocalRepeatFrom(repeatFrom);
      setIntervalInput(String(parsed.interval));
      setCountInput(String(parsed.count));
    }
  }

  const focusTrapRef = useFocusTrap(isOpen);
  useModalEscapeKey(onClose);

  if (!isOpen) return null;

  const update = (patch: Partial<RepeatUIState>) => {
    setUI((prev) => ({ ...prev, ...patch }));
  };

  const handleDone = () => {
    onSave(buildFromUIState(ui), localRepeatFrom);
    onClose();
  };

  const isRecurring = ui.freq !== 'none';
  const isDoneDisabled = ui.endMode === 'until' && !ui.until;

  const periodLabels = PRESET_PERIOD_LABEL[ui.freq];
  const periodLabel = periodLabels
    ? ui.interval === 1
      ? periodLabels.singular
      : periodLabels.plural
    : null;

  const showDayPicker =
    ui.freq === 'weekly' || (ui.freq === 'custom' && ui.customPeriod === 'WEEKLY');
  const showInterval = isRecurring && ui.freq !== 'weekdays';

  // Reorder weekdays to respect the user's week start preference
  // WEEKDAY_OPTIONS is MO-first (index 0=MO, ..., 6=SU)
  const WEEK_START_TO_RRULE_IDX: Record<string, number> = {
    monday: 0,
    tuesday: 1,
    wednesday: 2,
    thursday: 3,
    friday: 4,
    saturday: 5,
    sunday: 6,
  };
  const weekdayStartIdx = WEEK_START_TO_RRULE_IDX[startOfWeek] ?? 0;
  const orderedWeekdays = [
    ...WEEKDAY_OPTIONS.slice(weekdayStartIdx),
    ...WEEKDAY_OPTIONS.slice(0, weekdayStartIdx),
  ];

  return (
    <ModalBackdrop zIndex="z-60">
      <div
        ref={focusTrapRef}
        className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-sm animate-scale-in flex flex-col max-h-[90vh] relative"
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700 shrink-0">
          <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">Repeat</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <AppSelect
            value={ui.freq}
            onChange={(e) => {
              const freq = e.target.value as RecurrenceFrequency;
              const byday =
                freq === 'weekdays'
                  ? ['MO', 'TU', 'WE', 'TH', 'FR']
                  : freq === 'weekly' && ui.byday.length === 0
                    ? []
                    : ui.byday;
              update({ freq, byday });
            }}
            className={`w-full ${selectCls}`}
          >
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekdays">Every weekday (Mon–Fri)</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom…</option>
          </AppSelect>

          {showInterval && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-surface-600 dark:text-surface-400 shrink-0">Every</span>
              <input
                type="text"
                inputMode="numeric"
                value={intervalInput}
                onChange={(e) => setIntervalInput(e.target.value.replace(/[^0-9]/g, ''))}
                onBlur={() => {
                  const n = Math.max(1, parseInt(intervalInput, 10) || 1);
                  setIntervalInput(String(n));
                  update({ interval: n });
                }}
                className={`w-16 text-center ${inputCls}`}
              />
              {ui.freq === 'custom' ? (
                <AppSelect
                  value={ui.customPeriod}
                  onChange={(e) => {
                    const customPeriod = e.target.value as CustomPeriod;
                    const byday = customPeriod === 'WEEKLY' ? ui.byday : [];
                    update({ customPeriod, byday });
                  }}
                  className={selectCls}
                >
                  {CUSTOM_PERIOD_OPTIONS.map(({ value, label, plural }) => (
                    <option key={value} value={value}>
                      {ui.interval === 1 ? label : plural}
                    </option>
                  ))}
                </AppSelect>
              ) : (
                <span className="text-sm text-surface-700 dark:text-surface-300">
                  {periodLabel}
                </span>
              )}
            </div>
          )}

          {showDayPicker && (
            <fieldset aria-label="Days of week" className="flex gap-1.5 border-0 p-0 m-0 min-w-0">
              {orderedWeekdays.map(({ value, label }) => {
                const active = ui.byday.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      const byday = active
                        ? ui.byday.filter((d) => d !== value)
                        : [...ui.byday, value];
                      update({ byday });
                    }}
                    className={`w-9 h-9 rounded-full text-xs font-medium border transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 ${
                      active
                        ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                        : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:border-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </fieldset>
          )}

          {isRecurring && (
            <div className="space-y-2">
              <p className="text-xs text-surface-500 dark:text-surface-400">Ends</p>
              <div className="flex gap-2">
                {(
                  [
                    { value: 'never', label: 'Never' },
                    { value: 'count', label: 'After' },
                    { value: 'until', label: 'On date' },
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update({ endMode: value })}
                    className={`${btnBase} ${ui.endMode === value ? btnActive : btnInactive}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {ui.endMode === 'count' && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={countInput}
                    onChange={(e) => setCountInput(e.target.value.replace(/[^0-9]/g, ''))}
                    onBlur={() => {
                      const n = Math.max(1, parseInt(countInput, 10) || 1);
                      setCountInput(String(n));
                      update({ count: n });
                    }}
                    className={`w-16 text-center ${inputCls}`}
                  />
                  <span className="text-sm text-surface-600 dark:text-surface-400">
                    {ui.count === 1 ? 'time' : 'times'}
                  </span>
                </div>
              )}

              {ui.endMode === 'until' &&
                (() => {
                  const untilDate = ui.until
                    ? (() => {
                        const [y, m, d] = ui.until.split('-').map(Number);
                        return new Date(y, m - 1, d);
                      })()
                    : undefined;
                  return (
                    <button
                      type="button"
                      onClick={() => setShowUntilPicker(true)}
                      className="w-full flex items-center gap-2 h-9 px-3 py-2 text-sm text-left bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg hover:border-surface-300 dark:hover:border-surface-500 focus:outline-hidden focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
                    >
                      {untilDate ? (
                        <Calendar className="w-4 h-4 text-surface-400 shrink-0" />
                      ) : (
                        <CalendarPlus className="w-4 h-4 text-surface-400 shrink-0" />
                      )}
                      <span
                        className={
                          untilDate ? 'text-surface-700 dark:text-surface-300' : 'text-surface-400'
                        }
                      >
                        {untilDate ? formatDate(untilDate, true, dateFormat) : 'Set end date...'}
                      </span>
                    </button>
                  );
                })()}
            </div>
          )}

          {isRecurring && (
            <div className="space-y-2">
              <p className="text-xs text-surface-500 dark:text-surface-400">Advance from</p>
              <div className="flex gap-2">
                {(
                  [
                    { value: 0, label: 'Due date' },
                    { value: 1, label: 'Completion date' },
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLocalRepeatFrom(value)}
                    className={`${btnBase} ${localRepeatFrom === value ? btnActive : btnInactive}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-surface-200 dark:border-surface-700 shrink-0">
          <ModalButton variant="ghost" onClick={onClose}>
            Cancel
          </ModalButton>
          <ModalButton onClick={handleDone} disabled={isDoneDisabled}>
            Done
          </ModalButton>
        </div>
      </div>

      {showUntilPicker && (
        <DatePickerModal
          isOpen={showUntilPicker}
          onClose={() => setShowUntilPicker(false)}
          value={
            ui.until
              ? (() => {
                  const [y, m, d] = ui.until.split('-').map(Number);
                  return new Date(y, m - 1, d);
                })()
              : undefined
          }
          onChange={(date) => {
            if (date) {
              const y = date.getFullYear();
              const mo = String(date.getMonth() + 1).padStart(2, '0');
              const d = String(date.getDate()).padStart(2, '0');
              update({ until: `${y}-${mo}-${d}` });
            } else {
              update({ until: '' });
            }
          }}
          title="End Date"
          hideTimeControls
        />
      )}
    </ModalBackdrop>
  );
};
