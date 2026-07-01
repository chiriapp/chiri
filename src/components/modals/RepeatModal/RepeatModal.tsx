import Calendar from 'lucide-react/icons/calendar';
import CalendarPlus from 'lucide-react/icons/calendar-plus';
import { useState } from 'react';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { DatePickerModal } from '$components/modals/DatePickerModal';
import { RepeatFrequencyList } from '$components/modals/RepeatModal/RepeatFrequencyList';
import { RepeatRuleAlerts } from '$components/modals/RepeatModal/RepeatRuleAlerts';
import { RepeatRuleSummary } from '$components/modals/RepeatModal/RepeatRuleSummary';
import { Select } from '$components/Select';
import { useSettingsStore } from '$context/settingsContext';
import type { RecurrenceFrequency } from '$types/recurrence';
import { formatDate } from '$utils/date';
import {
  classifyRRule,
  frequencyToRRule,
  mergeRRuleParts,
  parseRRule,
  rruleToFrequency,
} from '$utils/recurrence';

interface RepeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  rrule: string | undefined;
  repeatFrom: number;
  dueDate?: Date;
  initialCustom?: boolean;
  onSave: (rrule: string | undefined, repeatFrom: number) => void;
}

type EndMode = 'never' | 'count' | 'until';
type CustomPeriod = 'MINUTELY' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
type MonthlyMode = 'monthday' | 'weekday';

interface RepeatUIState {
  freq: RecurrenceFrequency;
  interval: number;
  byday: string[];
  customPeriod: CustomPeriod;
  monthlyMode: MonthlyMode;
  monthlyDay: number;
  monthlyOrdinal: number;
  monthlyWeekday: string;
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

const getMonthlyDefaults = (dueDate?: Date) => {
  const date = dueDate ?? new Date();
  const weekdays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const occurrence = Math.ceil(date.getDate() / 7);
  return {
    monthlyDay: date.getDate(),
    monthlyOrdinal: occurrence > 4 ? -1 : occurrence,
    monthlyWeekday: weekdays[date.getDay()],
  };
};

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

const parseToUIState = (
  rrule: string | undefined,
  dueDate?: Date,
  initialCustom = false,
): RepeatUIState => {
  const defaults: RepeatUIState = {
    freq: initialCustom ? 'custom' : 'daily',
    interval: 1,
    byday: [],
    customPeriod: 'DAILY',
    monthlyMode: 'monthday',
    ...getMonthlyDefaults(dueDate),
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
  const ordinalWeekday = parts.BYDAY?.match(/^(-1|[1-4])(MO|TU|WE|TH|FR|SA|SU)$/);
  const monthlyMode: MonthlyMode = ordinalWeekday ? 'weekday' : 'monthday';
  const monthlyDefaults = getMonthlyDefaults(dueDate);
  const monthlyDay = parts.BYMONTHDAY
    ? Math.max(1, Math.min(31, parseInt(parts.BYMONTHDAY, 10)))
    : monthlyDefaults.monthlyDay;
  const monthlyOrdinal = ordinalWeekday
    ? parseInt(ordinalWeekday[1], 10)
    : monthlyDefaults.monthlyOrdinal;
  const monthlyWeekday = ordinalWeekday?.[2] ?? monthlyDefaults.monthlyWeekday;

  let until = defaults.until;
  if (parts.UNTIL) {
    const u = parts.UNTIL;
    until = `${u.slice(0, 4)}-${u.slice(4, 6)}-${u.slice(6, 8)}`;
  }

  return {
    freq,
    interval,
    byday,
    customPeriod,
    monthlyMode,
    monthlyDay,
    monthlyOrdinal,
    monthlyWeekday,
    endMode,
    count,
    until,
  };
};

const MANAGED_RRULE_KEYS = ['FREQ', 'INTERVAL', 'BYDAY', 'BYMONTHDAY', 'COUNT', 'UNTIL'] as const;

const buildFromUIState = (
  state: RepeatUIState,
  originalRrule?: string,
  initialState?: RepeatUIState,
) => {
  if (state.freq === 'none') return undefined;

  let base: Record<string, string>;

  if (state.freq === 'custom') {
    base = { FREQ: state.customPeriod };
    if (state.byday.length > 0 && state.customPeriod === 'WEEKLY') {
      base.BYDAY = state.byday.join(',');
    }
  } else {
    base = parseRRule(frequencyToRRule(state.freq));
    if (state.freq === 'weekly' && state.byday.length > 0) {
      base.BYDAY = state.byday.join(',');
    }
  }

  const isMonthly =
    state.freq === 'monthly' || (state.freq === 'custom' && state.customPeriod === 'MONTHLY');
  if (isMonthly) {
    if (state.monthlyMode === 'monthday') {
      base.BYMONTHDAY = String(state.monthlyDay);
    } else {
      base.BYDAY = `${state.monthlyOrdinal}${state.monthlyWeekday}`;
    }
  }

  if (state.interval > 1) base.INTERVAL = String(state.interval);

  if (state.endMode === 'count' && state.count > 0) {
    base.COUNT = String(state.count);
  } else if (state.endMode === 'until' && state.until) {
    base.UNTIL = `${state.until.replace(/-/g, '')}T000000Z`;
  }

  if (!originalRrule || !initialState) {
    return mergeRRuleParts(originalRrule, MANAGED_RRULE_KEYS, base);
  }

  const frequencyChanged =
    state.freq !== initialState.freq || state.customPeriod !== initialState.customPeriod;
  const selectorChanged =
    frequencyChanged ||
    state.monthlyMode !== initialState.monthlyMode ||
    state.monthlyDay !== initialState.monthlyDay ||
    state.monthlyOrdinal !== initialState.monthlyOrdinal ||
    state.monthlyWeekday !== initialState.monthlyWeekday ||
    state.byday.join(',') !== initialState.byday.join(',');
  const endChanged =
    state.endMode !== initialState.endMode ||
    state.count !== initialState.count ||
    state.until !== initialState.until;
  const managedKeys: string[] = [];
  const updates: Record<string, string | undefined> = {};

  if (frequencyChanged) {
    managedKeys.push('FREQ');
    updates.FREQ = base.FREQ;
  }
  if (selectorChanged) {
    managedKeys.push('BYDAY', 'BYMONTHDAY');
    updates.BYDAY = base.BYDAY;
    updates.BYMONTHDAY = base.BYMONTHDAY;
  }
  if (state.interval !== initialState.interval) {
    managedKeys.push('INTERVAL');
    updates.INTERVAL = base.INTERVAL;
  }
  if (endChanged) {
    managedKeys.push('COUNT', 'UNTIL');
    updates.COUNT = base.COUNT;
    updates.UNTIL = base.UNTIL;
  }

  return mergeRRuleParts(originalRrule, managedKeys, updates);
};

const inputCls =
  'h-9 px-3 py-2 text-sm bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg ' +
  'focus:outline-hidden focus:border-primary-500 ' +
  'focus:bg-white dark:focus:bg-surface-800 transition-colors ' +
  'text-surface-800 dark:text-surface-200';

const selectCls =
  'h-9 text-sm border border-surface-200 dark:border-surface-600 bg-surface-100 dark:bg-surface-700 ' +
  'text-surface-800 dark:text-surface-200 rounded-lg focus:outline-hidden ' +
  'focus:border-primary-500 ' +
  'focus:bg-white dark:focus:bg-surface-800 transition-colors';

const btnBase =
  'flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ' +
  'outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500';

const btnActive =
  'border-surface-300 dark:border-surface-500 bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100';

const btnInactive =
  'border-surface-200 dark:border-surface-700 hover:border-surface-300 hover:bg-surface-50 ' +
  'dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400';

export const RepeatModal = ({
  isOpen,
  onClose,
  rrule,
  repeatFrom,
  dueDate,
  initialCustom = false,
  onSave,
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: top-level coordinator delegates the major visual sections and owns their shared draft state
}: RepeatModalProps) => {
  const [ui, setUI] = useState<RepeatUIState>(() => parseToUIState(rrule, dueDate, initialCustom));
  const [localRepeatFrom, setLocalRepeatFrom] = useState(repeatFrom);
  const [intervalInput, setIntervalInput] = useState(() =>
    String(parseToUIState(rrule, dueDate).interval),
  );
  const [countInput, setCountInput] = useState(() => String(parseToUIState(rrule, dueDate).count));
  const [showUntilPicker, setShowUntilPicker] = useState(false);

  const { dateFormat, startOfWeek } = useSettingsStore();

  // reset local state whenever the modal opens
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      const parsed = parseToUIState(rrule, dueDate, initialCustom);
      setUI(parsed);
      setLocalRepeatFrom(repeatFrom);
      setIntervalInput(String(parsed.interval));
      setCountInput(String(parsed.count));
    }
  }

  if (!isOpen) return null;

  const update = (patch: Partial<RepeatUIState>) => {
    setUI((prev) => ({ ...prev, ...patch }));
  };

  const handleDone = () => {
    const initialState = parseToUIState(rrule, dueDate, initialCustom);
    const ruleChanged = JSON.stringify(ui) !== JSON.stringify(initialState);
    onSave(
      !ruleChanged && rrule ? rrule : buildFromUIState(ui, rrule, initialState),
      localRepeatFrom,
    );
    onClose();
  };

  const isRecurring = ui.freq !== 'none';

  const periodLabels = PRESET_PERIOD_LABEL[ui.freq];
  const periodLabel = periodLabels
    ? ui.interval === 1
      ? periodLabels.singular
      : periodLabels.plural
    : null;

  const showDayPicker =
    ui.freq === 'weekly' || (ui.freq === 'custom' && ui.customPeriod === 'WEEKLY');
  const showInterval = isRecurring && ui.freq !== 'weekdays';
  const showMonthlyPattern =
    ui.freq === 'monthly' || (ui.freq === 'custom' && ui.customPeriod === 'MONTHLY');
  const initialState = parseToUIState(rrule, dueDate, initialCustom);
  const ruleChanged = JSON.stringify(ui) !== JSON.stringify(initialState);
  const draftRrule = !ruleChanged && rrule ? rrule : buildFromUIState(ui, rrule, initialState);
  const capability = classifyRRule(rrule);
  const frequencyChanged =
    ui.freq !== initialState.freq || ui.customPeriod !== initialState.customPeriod;
  const selectorChanged =
    ui.monthlyMode !== initialState.monthlyMode ||
    ui.monthlyDay !== initialState.monthlyDay ||
    ui.monthlyOrdinal !== initialState.monthlyOrdinal ||
    ui.monthlyWeekday !== initialState.monthlyWeekday ||
    ui.byday.join(',') !== initialState.byday.join(',');
  const hasUnsafeImportedEdit =
    ruleChanged &&
    (capability.invalidParts.length > 0 ||
      (capability.preservedKeys.length > 0 && (frequencyChanged || selectorChanged)));
  const hasInvalidMonthlyDay =
    showMonthlyPattern &&
    ui.monthlyMode === 'monthday' &&
    (!Number.isInteger(ui.monthlyDay) || ui.monthlyDay < 1 || ui.monthlyDay > 31);
  const validationError = hasInvalidMonthlyDay
    ? 'Choose a day from 1 to 31.'
    : hasUnsafeImportedEdit
      ? 'This imported rule cannot be safely changed in the visual editor.'
      : null;
  const isDoneDisabled = (ui.endMode === 'until' && !ui.until) || validationError !== null;

  // reorder weekdays to respect the user's week start preference
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
    <>
      <ModalWrapper
        isOpen={isOpen}
        onClose={onClose}
        title="Repeat"
        className="max-w-140"
        zIndex="z-60"
        contentPadding={false}
        contentOverflow="auto"
        footerLeft={
          rrule ? (
            <ModalButton
              variant="ghost"
              onClick={() => {
                onSave(undefined, localRepeatFrom);
                onClose();
              }}
              className="text-surface-500 hover:bg-semantic-error/10 hover:text-semantic-error"
            >
              Clear
            </ModalButton>
          ) : null
        }
        footer={
          <>
            <ModalButton variant="ghost" onClick={onClose}>
              Cancel
            </ModalButton>
            <ModalButton onClick={handleDone} disabled={isDoneDisabled}>
              Done
            </ModalButton>
          </>
        }
      >
        <div className="flex min-h-100">
          <RepeatFrequencyList
            value={ui.freq}
            dueDate={dueDate}
            onChange={(freq, byday) => update({ freq, byday })}
          />
          <div className="min-w-0 flex-1 space-y-4 p-4">
            <RepeatRuleAlerts
              preservedKeys={capability.preservedKeys}
              invalidParts={capability.invalidParts}
              validationError={validationError}
            />
            {showInterval && (
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-sm text-surface-600 dark:text-surface-400">
                  Every
                </span>
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
                  <Select
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
                  </Select>
                ) : (
                  <span className="text-sm text-surface-700 dark:text-surface-300">
                    {periodLabel}
                  </span>
                )}
              </div>
            )}

            {showDayPicker && (
              <fieldset aria-label="Days of week" className="m-0 flex min-w-0 gap-1.5 border-0 p-0">
                {orderedWeekdays.map(({ value, label }) => {
                  const active = ui.byday.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        const byday = active
                          ? ui.byday.filter((d) => d !== value)
                          : [...ui.byday, value];
                        update({ byday });
                      }}
                      className={`h-9 w-9 rounded-full border font-medium text-xs outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 ${
                        active
                          ? 'border-surface-300 bg-surface-200 text-surface-900 dark:border-surface-500 dark:bg-surface-700 dark:text-surface-100'
                          : 'border-surface-200 text-surface-600 hover:border-surface-300 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </fieldset>
            )}

            {showMonthlyPattern && (
              <div className="space-y-2">
                <p className="text-surface-500 text-xs dark:text-surface-400">Repeat on</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-pressed={ui.monthlyMode === 'monthday'}
                    onClick={() => update({ monthlyMode: 'monthday' })}
                    className={`${btnBase} ${ui.monthlyMode === 'monthday' ? btnActive : btnInactive}`}
                  >
                    Day of month
                  </button>
                  <button
                    type="button"
                    aria-pressed={ui.monthlyMode === 'weekday'}
                    onClick={() => update({ monthlyMode: 'weekday' })}
                    className={`${btnBase} ${ui.monthlyMode === 'weekday' ? btnActive : btnInactive}`}
                  >
                    Weekday
                  </button>
                </div>
                {ui.monthlyMode === 'monthday' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-surface-600 dark:text-surface-400">Day</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={ui.monthlyDay}
                      onChange={(event) =>
                        update({
                          monthlyDay: Math.max(1, Math.min(31, Number(event.target.value))),
                        })
                      }
                      className={`w-20 text-center ${inputCls}`}
                    />
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select
                      value={ui.monthlyOrdinal}
                      onChange={(event) => update({ monthlyOrdinal: Number(event.target.value) })}
                      className={`flex-1 ${selectCls}`}
                    >
                      <option value={1}>First</option>
                      <option value={2}>Second</option>
                      <option value={3}>Third</option>
                      <option value={4}>Fourth</option>
                      <option value={-1}>Last</option>
                    </Select>
                    <Select
                      value={ui.monthlyWeekday}
                      onChange={(event) => update({ monthlyWeekday: event.target.value })}
                      className={`flex-1 ${selectCls}`}
                    >
                      {WEEKDAY_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            )}

            {isRecurring && (
              <div className="space-y-2">
                <p className="text-surface-500 text-xs dark:text-surface-400">Ends</p>
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
                      aria-pressed={ui.endMode === value}
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
                        className="flex h-9 w-full items-center gap-2 rounded-lg border border-transparent bg-surface-100 px-3 py-2 text-left text-sm transition-colors hover:border-surface-300 focus:border-primary-500 focus:bg-white focus:outline-hidden dark:bg-surface-700 dark:focus:bg-surface-800 dark:hover:border-surface-500"
                      >
                        {untilDate ? (
                          <Calendar className="h-4 w-4 shrink-0 text-surface-400" />
                        ) : (
                          <CalendarPlus className="h-4 w-4 shrink-0 text-surface-400" />
                        )}
                        <span
                          className={
                            untilDate
                              ? 'text-surface-700 dark:text-surface-300'
                              : 'text-surface-400'
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
                <p className="text-surface-500 text-xs dark:text-surface-400">Schedule next task</p>
                <div className="flex gap-2">
                  {(
                    [
                      { value: 0, label: 'Keep schedule' },
                      { value: 1, label: 'After completion' },
                    ] as const
                  ).map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={localRepeatFrom === value}
                      onClick={() => setLocalRepeatFrom(value)}
                      className={`${btnBase} ${localRepeatFrom === value ? btnActive : btnInactive}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <RepeatRuleSummary
              rrule={draftRrule}
              repeatFrom={localRepeatFrom}
              dueDate={dueDate}
              dateFormat={dateFormat}
            />
          </div>
        </div>
      </ModalWrapper>

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
    </>
  );
};
