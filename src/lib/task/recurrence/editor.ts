import {
  frequencyToRRule,
  mergeRRuleParts,
  parseRRule,
  rruleToFrequency,
} from '$lib/task/recurrence';
import type { WorkingDay } from '$types/settings/categories/scheduling';
import type { RecurrenceFrequency } from '$types/task/recurrence';
import { DEFAULT_WORKING_DAYS, WORKING_DAY_META } from '$utils/calendar';

export type EndMode = 'never' | 'count' | 'until';
export type CustomPeriod = 'MINUTELY' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type MonthlyMode = 'monthday' | 'weekday';

export interface RepeatUIState {
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
  until: string;
}

const SORTED_WORKING_DAY_META = Object.values(WORKING_DAY_META).sort(
  (a, b) => a.dayIndex - b.dayIndex,
);

export const WEEKDAY_OPTIONS = [
  ...SORTED_WORKING_DAY_META.slice(1),
  SORTED_WORKING_DAY_META[0],
].map((meta) => ({
  value: meta.rruleByday,
  label: meta.longLabel,
}));

export const CUSTOM_PERIOD_OPTIONS: { value: CustomPeriod; label: string; plural: string }[] = [
  { value: 'MINUTELY', label: 'minute', plural: 'minutes' },
  { value: 'HOURLY', label: 'hour', plural: 'hours' },
  { value: 'DAILY', label: 'day', plural: 'days' },
  { value: 'WEEKLY', label: 'week', plural: 'weeks' },
  { value: 'MONTHLY', label: 'month', plural: 'months' },
  { value: 'YEARLY', label: 'year', plural: 'years' },
];

export const PRESET_PERIOD_LABEL: Partial<
  Record<RecurrenceFrequency, { singular: string; plural: string }>
> = {
  daily: { singular: 'day', plural: 'days' },
  weekly: { singular: 'week', plural: 'weeks' },
  monthly: { singular: 'month', plural: 'months' },
  yearly: { singular: 'year', plural: 'years' },
};

export const getMonthlyDefaults = (dueDate?: Date) => {
  const date = dueDate ?? new Date();
  const weekdays = SORTED_WORKING_DAY_META.map((meta) => meta.rruleByday);
  const occurrence = Math.ceil(date.getDate() / 7);
  return {
    monthlyDay: date.getDate(),
    monthlyOrdinal: occurrence > 4 ? -1 : occurrence,
    monthlyWeekday: weekdays[date.getDay()],
  };
};

export const parseRepeatUIState = (
  rrule: string | undefined,
  dueDate?: Date,
  initialCustom = false,
  workingDays: WorkingDay[] = DEFAULT_WORKING_DAYS,
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
  const freq = rruleToFrequency(rrule, workingDays);
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
    const value = parts.UNTIL;
    until = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
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

export const buildRepeatRRule = (
  state: RepeatUIState,
  originalRrule?: string,
  initialState?: RepeatUIState,
  workingDays: WorkingDay[] = DEFAULT_WORKING_DAYS,
) => {
  if (state.freq === 'none') return undefined;

  let base: Record<string, string>;

  if (state.freq === 'custom') {
    base = { FREQ: state.customPeriod };
    if (state.byday.length > 0 && state.customPeriod === 'WEEKLY') {
      base.BYDAY = state.byday.join(',');
    }
  } else {
    base = parseRRule(frequencyToRRule(state.freq, undefined, workingDays));
    if ((state.freq === 'weekly' || state.freq === 'weekdays') && state.byday.length > 0) {
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
