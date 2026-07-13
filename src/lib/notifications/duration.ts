import type { SnoozeDuration, SnoozeDurationUnit } from '$types/settings';

const SECONDS_PER_UNIT: Record<SnoozeDurationUnit, number> = {
  seconds: 1,
  minutes: 60,
  hours: 60 * 60,
  days: 60 * 60 * 24,
  weeks: 60 * 60 * 24 * 7,
};

export const SNOOZE_DURATION_UNITS: Array<{ value: SnoozeDurationUnit; label: string }> = [
  { value: 'seconds', label: 'seconds' },
  { value: 'minutes', label: 'minutes' },
  { value: 'hours', label: 'hours' },
  { value: 'days', label: 'days' },
  { value: 'weeks', label: 'weeks' },
];

export const snoozeDurationToSeconds = (duration: SnoozeDuration): number => {
  return duration.value * SECONDS_PER_UNIT[duration.unit];
};

export const secondsToSnoozeDuration = (totalSeconds: number): SnoozeDuration => {
  if (totalSeconds === 0) {
    return { id: crypto.randomUUID(), value: 0, unit: 'minutes' };
  }

  for (const unit of ['weeks', 'days', 'hours', 'minutes', 'seconds'] as SnoozeDurationUnit[]) {
    const factor = SECONDS_PER_UNIT[unit];
    if (totalSeconds % factor === 0) {
      return {
        id: crypto.randomUUID(),
        value: totalSeconds / factor,
        unit,
      };
    }
  }

  return {
    id: crypto.randomUUID(),
    value: totalSeconds,
    unit: 'seconds',
  };
};
