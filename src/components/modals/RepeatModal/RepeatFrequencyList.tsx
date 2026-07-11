import type { RecurrenceFrequency } from '$types/recurrence';
import { frequencyToRRule, parseRRule } from '$utils/recurrence';

const OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom…' },
];

interface RepeatFrequencyListProps {
  value: RecurrenceFrequency;
  dueDate?: Date;
  onChange: (frequency: RecurrenceFrequency, byday: string[]) => void;
}

export const RepeatFrequencyList = ({ value, dueDate, onChange }: RepeatFrequencyListProps) => (
  <div className="flex w-40 shrink-0 flex-col gap-1.5 border-surface-200 border-r p-4 dark:border-surface-700">
    {OPTIONS.map((option) => (
      <button
        key={option.value}
        type="button"
        aria-pressed={value === option.value}
        onClick={() => {
          const byday =
            option.value === 'weekdays'
              ? ['MO', 'TU', 'WE', 'TH', 'FR']
              : option.value === 'weekly'
                ? (parseRRule(frequencyToRRule('weekly', dueDate)).BYDAY?.split(',') ?? [])
                : [];
          onChange(option.value, byday);
        }}
        className={`w-full rounded-lg px-2 py-1.5 text-left font-medium text-xs outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
          value === option.value
            ? 'bg-primary-500 text-primary-contrast'
            : 'bg-surface-100 text-surface-700 hover:bg-surface-200 dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);
