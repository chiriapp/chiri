import type { DateFormat } from '$types/preference';
import { formatDate } from '$utils/date';
import { getNextOccurrences, rruleToText } from '$utils/recurrence';

interface RepeatRuleSummaryProps {
  rrule?: string;
  repeatFrom: number;
  dueDate?: Date;
  dateFormat: DateFormat;
}

export const RepeatRuleSummary = ({
  rrule,
  repeatFrom,
  dueDate,
  dateFormat,
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
    </>
  );
};
