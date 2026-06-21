import type { DateFormat } from '$types/preference';
import { formatDate } from '$utils/date';
import { getNextOccurrences, rruleToText } from '$utils/recurrence';

interface RepeatRuleSummaryProps {
  rrule?: string;
  repeatFrom: number;
  dueDate?: Date;
  dateFormat: DateFormat;
  preservedKeys: string[];
  invalidParts: string[];
  validationError: string | null;
}

export const RepeatRuleSummary = ({
  rrule,
  repeatFrom,
  dueDate,
  dateFormat,
  preservedKeys,
  invalidParts,
  validationError,
}: RepeatRuleSummaryProps) => {
  const previewStart = dueDate ?? new Date();
  const occurrences =
    rrule && repeatFrom !== 1 ? getNextOccurrences(rrule, previewStart, previewStart, 3) : [];

  return (
    <>
      {rrule && (
        <div className="rounded-lg bg-primary-500/10 px-3 py-2.5">
          <p className="font-medium text-sm text-surface-800 dark:text-surface-100">
            {rruleToText(rrule, repeatFrom, dateFormat)}
          </p>
          {repeatFrom === 1 ? (
            <p className="mt-1 text-surface-500 text-xs dark:text-surface-400">
              Future dates depend on when the task is completed.
            </p>
          ) : occurrences.length > 0 ? (
            <p className="mt-1 text-surface-500 text-xs dark:text-surface-400">
              Next: {occurrences.map((date) => formatDate(date, true, dateFormat)).join(' · ')}
            </p>
          ) : null}
        </div>
      )}
      {preservedKeys.length > 0 && (
        <div className="rounded-lg border border-semantic-warning/30 bg-semantic-warning/10 px-3 py-2.5 text-xs">
          <p className="font-medium text-semantic-warning">Preserved recurrence options</p>
          <p className="mt-1 text-surface-600 dark:text-surface-300">
            Chiri will keep {preservedKeys.join(', ')} unchanged. Interval and ending options can
            still be edited safely.
          </p>
        </div>
      )}
      {invalidParts.length > 0 && (
        <div className="rounded-lg border border-semantic-error/30 bg-semantic-error/10 px-3 py-2.5 text-xs">
          <p className="font-medium text-semantic-error">Unsafe imported recurrence</p>
          <p className="mt-1 text-surface-600 dark:text-surface-300">
            Chiri cannot safely edit {invalidParts.join(', ')}. The original rule will remain
            unchanged unless it is cleared.
          </p>
        </div>
      )}
      {validationError && (
        <p role="alert" className="text-semantic-error text-xs">
          {validationError}
        </p>
      )}
    </>
  );
};
