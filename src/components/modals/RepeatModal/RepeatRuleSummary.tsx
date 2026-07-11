import CalendarClock from 'lucide-react/icons/calendar-clock';
import CornerDownRight from 'lucide-react/icons/corner-down-right';
import RefreshCw from 'lucide-react/icons/refresh-cw';
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

  const summaryText = rrule ? rruleToText(rrule, repeatFrom, dateFormat) : '';
  const [ruleText, fromText] = summaryText.split(' · from ') as [string, string | undefined];

  return (
    <>
      {rrule && (
        <div className="space-y-2">
          <p className="text-surface-500 text-xs dark:text-surface-400">Summary</p>
          <div className="rounded-lg border border-surface-200 bg-surface-100 px-3 py-2.5 dark:border-surface-700 dark:bg-surface-800/50">
            <div className="grid grid-cols-[auto_1fr] items-start gap-x-2 gap-y-1.5">
              <RefreshCw className="mt-0.5 h-3.5 w-3.5 text-surface-400" />
              <span className="font-medium text-sm text-surface-800 dark:text-surface-100">
                {ruleText}
              </span>
              {fromText && (
                <>
                  <CornerDownRight className="h-3.5 w-3.5 text-surface-400" />
                  <span className="text-surface-500 text-xs dark:text-surface-400">
                    from {fromText}
                  </span>
                </>
              )}
              {repeatFrom === 1 ? (
                <>
                  <CalendarClock className="h-3.5 w-3.5 text-surface-400" />
                  <span className="text-surface-500 text-xs dark:text-surface-400">
                    Future dates depend on when the task is completed.
                  </span>
                </>
              ) : occurrences.length > 0 ? (
                <>
                  <CalendarClock className="h-3.5 w-3.5 text-surface-400" />
                  <span className="text-surface-500 text-xs dark:text-surface-400">
                    Next:{' '}
                    {occurrences.map((date) => formatDate(date, true, dateFormat)).join(' · ')}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
