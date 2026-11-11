import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { classifyRRule } from '$lib/task/recurrence';
import {
  buildRepeatRRule,
  type CustomPeriod,
  PRESET_PERIOD_LABEL,
  parseRepeatUIState,
  type RepeatUIState,
  WEEKDAY_OPTIONS,
} from '$lib/task/recurrence/editor';
import type { StartOfWeek } from '$types/settings/categories/region';
import type { WorkingDay } from '$types/settings/categories/scheduling';
import { DEFAULT_WORKING_DAYS } from '$utils/calendar';

interface UseRepeatDraftOptions {
  isOpen: boolean;
  rrule?: string;
  repeatFrom: number;
  dueDate?: Date;
  initialCustom: boolean;
  startOfWeek: StartOfWeek;
  workingDays: WorkingDay[];
}

export interface RepeatDraft {
  ui: RepeatUIState;
  localRepeatFrom: number;
  intervalInput: string;
  countInput: string;
  showUntilPicker: boolean;
  isRecurring: boolean;
  showDayPicker: boolean;
  showInterval: boolean;
  showMonthlyPattern: boolean;
  periodLabel: string | null;
  orderedWeekdays: typeof WEEKDAY_OPTIONS;
  capability: ReturnType<typeof classifyRRule>;
  validationError: string | null;
  isActionDisabled: boolean;
  actionLabel: string;
  draftRrule: string | undefined;
  update: (patch: Partial<RepeatUIState>) => void;
  selectFrequency: (frequency: RepeatUIState['freq'], byday: string[]) => void;
  setLocalRepeatFrom: (value: number) => void;
  setShowUntilPicker: (visible: boolean) => void;
  handleIntervalInputChange: (value: string) => void;
  handleIntervalInputBlur: () => void;
  handleCountInputChange: (value: string) => void;
  handleCountInputBlur: () => void;
}

const WEEK_START_TO_RRULE_IDX: Record<StartOfWeek, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

const PRESET_CUSTOM_PERIOD: Partial<Record<RepeatUIState['freq'], CustomPeriod>> = {
  daily: 'DAILY',
  weekdays: 'WEEKLY',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
  yearly: 'YEARLY',
};

export const useRepeatDraft = ({
  isOpen,
  rrule,
  repeatFrom,
  dueDate,
  initialCustom,
  startOfWeek,
  workingDays = DEFAULT_WORKING_DAYS,
}: UseRepeatDraftOptions): RepeatDraft => {
  const [ui, setUI] = useState<RepeatUIState>(() =>
    parseRepeatUIState(rrule, dueDate, initialCustom, workingDays),
  );
  const [localRepeatFrom, setLocalRepeatFrom] = useState(repeatFrom);
  const [intervalInput, setIntervalInput] = useState(() =>
    String(parseRepeatUIState(rrule, dueDate, initialCustom, workingDays).interval),
  );
  const [countInput, setCountInput] = useState(() =>
    String(parseRepeatUIState(rrule, dueDate, initialCustom, workingDays).count),
  );
  const [showUntilPicker, setShowUntilPicker] = useState(false);
  const previousIsOpen = useRef(isOpen);

  useEffect(() => {
    if (!isOpen) {
      previousIsOpen.current = false;
      return;
    }

    if (!previousIsOpen.current) {
      const parsed = parseRepeatUIState(rrule, dueDate, initialCustom, workingDays);
      setUI(parsed);
      setLocalRepeatFrom(repeatFrom);
      setIntervalInput(String(parsed.interval));
      setCountInput(String(parsed.count));
      setShowUntilPicker(false);
    }

    previousIsOpen.current = true;
  }, [dueDate, initialCustom, isOpen, repeatFrom, rrule, workingDays]);

  const update = useCallback((patch: Partial<RepeatUIState>) => {
    setUI((previous) => ({ ...previous, ...patch }));
  }, []);

  const selectFrequency = useCallback((frequency: RepeatUIState['freq'], byday: string[]) => {
    setUI((previous) => ({
      ...previous,
      freq: frequency,
      byday,
      interval: frequency === 'custom' ? previous.interval : 1,
      customPeriod: PRESET_CUSTOM_PERIOD[frequency] ?? previous.customPeriod,
    }));
    if (frequency !== 'custom') setIntervalInput('1');
  }, []);

  const handleIntervalInputChange = useCallback((value: string) => {
    setIntervalInput(value.replace(/[^0-9]/g, ''));
  }, []);

  const handleIntervalInputBlur = useCallback(() => {
    const next = Math.max(1, parseInt(intervalInput, 10) || 1);
    setIntervalInput(String(next));
    setUI((previous) => {
      const customPeriod = PRESET_CUSTOM_PERIOD[previous.freq];
      const shouldUseCustom = next > 1 && previous.freq !== 'custom' && customPeriod;

      return {
        ...previous,
        interval: next,
        ...(shouldUseCustom ? { freq: 'custom' as const, customPeriod } : {}),
      };
    });
  }, [intervalInput]);

  const handleCountInputChange = useCallback((value: string) => {
    setCountInput(value.replace(/[^0-9]/g, ''));
  }, []);

  const handleCountInputBlur = useCallback(() => {
    const next = Math.max(1, parseInt(countInput, 10) || 1);
    setCountInput(String(next));
    setUI((previous) => ({ ...previous, count: next }));
  }, [countInput]);

  const initialState = useMemo(
    () => parseRepeatUIState(rrule, dueDate, initialCustom, workingDays),
    [dueDate, initialCustom, rrule, workingDays],
  );
  const ruleChanged = JSON.stringify(ui) !== JSON.stringify(initialState);
  const isRecurring = ui.freq !== 'none';
  const showDayPicker =
    ui.freq === 'weekly' ||
    ui.freq === 'weekdays' ||
    (ui.freq === 'custom' && ui.customPeriod === 'WEEKLY');
  const showInterval = isRecurring && ui.freq !== 'weekdays';
  const showMonthlyPattern =
    ui.freq === 'monthly' || (ui.freq === 'custom' && ui.customPeriod === 'MONTHLY');
  const periodLabels = PRESET_PERIOD_LABEL[ui.freq];
  const periodLabel = periodLabels
    ? ui.interval === 1
      ? periodLabels.singular
      : periodLabels.plural
    : null;
  const capability = useMemo(() => classifyRRule(rrule), [rrule]);
  const frequencyChanged =
    ui.freq !== initialState.freq || ui.customPeriod !== initialState.customPeriod;
  const selectorChanged =
    ui.monthlyMode !== initialState.monthlyMode ||
    ui.monthlyDay !== initialState.monthlyDay ||
    ui.monthlyOrdinal !== initialState.monthlyOrdinal ||
    ui.monthlyWeekday !== initialState.monthlyWeekday ||
    ui.byday.join(',') !== initialState.byday.join(',');
  const hasChanges = ruleChanged || localRepeatFrom !== repeatFrom;
  const isViewChanged = ui.freq !== initialState.freq;
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
  const isActionDisabled =
    (ui.endMode === 'until' && !ui.until) ||
    validationError !== null ||
    (Boolean(rrule) && !hasChanges && !isViewChanged);
  const weekdayStartIndex = WEEK_START_TO_RRULE_IDX[startOfWeek] ?? 0;
  const orderedWeekdays = useMemo(
    () => [
      ...WEEKDAY_OPTIONS.slice(weekdayStartIndex),
      ...WEEKDAY_OPTIONS.slice(0, weekdayStartIndex),
    ],
    [weekdayStartIndex],
  );

  return {
    ui,
    localRepeatFrom,
    intervalInput,
    countInput,
    showUntilPicker,
    isRecurring,
    showDayPicker,
    showInterval,
    showMonthlyPattern,
    periodLabel,
    orderedWeekdays,
    capability,
    validationError,
    isActionDisabled,
    actionLabel: rrule ? 'Edit' : 'Add',
    draftRrule:
      !ruleChanged && rrule ? rrule : buildRepeatRRule(ui, rrule, initialState, workingDays),
    update,
    selectFrequency,
    setLocalRepeatFrom,
    setShowUntilPicker,
    handleIntervalInputChange,
    handleIntervalInputBlur,
    handleCountInputChange,
    handleCountInputBlur,
  };
};
