import Calendar from 'lucide-react/icons/calendar';
import CalendarPlus from 'lucide-react/icons/calendar-plus';
import { RepeatFrequencyList } from '$components/modals/RepeatModal/RepeatFrequencyList';
import { RepeatRuleAlerts } from '$components/modals/RepeatModal/RepeatRuleAlerts';
import { RepeatRuleSummary } from '$components/modals/RepeatModal/RepeatRuleSummary';
import { Select } from '$components/Select';
import type { RepeatDraft } from '$hooks/ui/useRepeatDraft';
import type { CustomPeriod, EndMode, MonthlyMode } from '$lib/task/recurrence/editor';
import { CUSTOM_PERIOD_OPTIONS, WEEKDAY_OPTIONS } from '$lib/task/recurrence/editor';
import type { DateFormat } from '$types/settings/categories/region';
import { formatDate, parseDateInputValue } from '$utils/date';

interface RepeatRuleEditorProps {
  draft: RepeatDraft;
  dueDate?: Date;
  dateFormat: DateFormat;
  onOpenUntilPicker: () => void;
}

const inputCls =
  'h-9 px-3 py-2 text-sm bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg ' +
  'focus:outline-hidden focus:border-primary-ink ' +
  'focus:bg-white dark:focus:bg-surface-800 transition-colors ' +
  'text-surface-800 dark:text-surface-200';

const selectCls =
  'h-9 text-sm border border-surface-200 dark:border-surface-600 bg-surface-100 dark:bg-surface-700 ' +
  'text-surface-800 dark:text-surface-200 rounded-lg focus:outline-hidden ' +
  'focus:border-primary-ink ' +
  'focus:bg-white dark:focus:bg-surface-800 transition-colors';

const btnBase =
  'flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ' +
  'outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-ink';

const btnActive =
  'border-surface-300 dark:border-surface-500 bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100';

const btnInactive =
  'border-surface-200 dark:border-surface-700 hover:border-surface-300 hover:bg-surface-50 ' +
  'dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400';

export const RepeatRuleEditor = ({
  draft,
  dueDate,
  dateFormat,
  onOpenUntilPicker,
}: RepeatRuleEditorProps) => {
  const { ui } = draft;

  return (
    <div className="flex min-h-100">
      <RepeatFrequencyList value={ui.freq} dueDate={dueDate} onChange={draft.selectFrequency} />
      <div className="flex min-w-0 flex-1 flex-col space-y-4 p-4">
        <RepeatRuleAlerts
          preservedKeys={draft.capability.preservedKeys}
          invalidParts={draft.capability.invalidParts}
          validationError={draft.validationError}
        />

        {draft.isRecurring && (
          <div className="space-y-2">
            <p className="text-surface-500 text-xs dark:text-surface-400">Repeat every</p>
            {draft.showInterval ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft.intervalInput}
                  onChange={(event) => draft.handleIntervalInputChange(event.target.value)}
                  onBlur={draft.handleIntervalInputBlur}
                  className={`w-16 text-center ${inputCls}`}
                />
                {ui.freq === 'custom' ? (
                  <Select
                    value={ui.customPeriod}
                    onChange={(event) => {
                      const customPeriod = event.target.value as CustomPeriod;
                      const byday = customPeriod === 'WEEKLY' ? ui.byday : [];
                      draft.update({ customPeriod, byday });
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
                    {draft.periodLabel}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-surface-700 dark:text-surface-300">Weekday</span>
            )}
          </div>
        )}

        {draft.showDayPicker && (
          <div className="space-y-2">
            <p className="text-surface-500 text-xs dark:text-surface-400">On days</p>
            <fieldset aria-label="Days of week" className="m-0 flex min-w-0 gap-1.5 border-0 p-0">
              {(ui.freq === 'weekdays'
                ? draft.orderedWeekdays.filter(({ value }) => value !== 'SA' && value !== 'SU')
                : draft.orderedWeekdays
              ).map(({ value, label }) => {
                const active = ui.byday.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      draft.update({
                        byday: active
                          ? ui.byday.filter((day) => day !== value)
                          : [...ui.byday, value],
                      })
                    }
                    className={`h-9 w-9 rounded-full border font-medium text-xs outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink ${
                      active
                        ? 'border-surface-300 bg-surface-200 text-surface-900 dark:border-surface-500 dark:bg-surface-700 dark:text-surface-100'
                        : 'border-surface-200 text-surface-600 hover:border-surface-300 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-700'
                    }`}
                  >
                    {label.slice(0, 3)}
                  </button>
                );
              })}
            </fieldset>
          </div>
        )}

        {draft.showMonthlyPattern && (
          <div className="space-y-2">
            <p className="text-surface-500 text-xs dark:text-surface-400">Repeat on</p>
            <div className="flex gap-2">
              {(
                [
                  { value: 'monthday' as const, label: 'Day of month' },
                  { value: 'weekday' as const, label: 'Weekday' },
                ] satisfies { value: MonthlyMode; label: string }[]
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={ui.monthlyMode === value}
                  onClick={() => draft.update({ monthlyMode: value })}
                  className={`${btnBase} ${ui.monthlyMode === value ? btnActive : btnInactive}`}
                >
                  {label}
                </button>
              ))}
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
                    draft.update({
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
                  onChange={(event) => draft.update({ monthlyOrdinal: Number(event.target.value) })}
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
                  onChange={(event) => draft.update({ monthlyWeekday: event.target.value })}
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

        {draft.isRecurring && (
          <div className="space-y-2">
            <p className="text-surface-500 text-xs dark:text-surface-400">Ends</p>
            <div className="flex gap-2">
              {(
                [
                  { value: 'never' as const, label: 'Never' },
                  { value: 'count' as const, label: 'After' },
                  { value: 'until' as const, label: 'On date' },
                ] satisfies { value: EndMode; label: string }[]
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={ui.endMode === value}
                  onClick={() => draft.update({ endMode: value })}
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
                  value={draft.countInput}
                  onChange={(event) => draft.handleCountInputChange(event.target.value)}
                  onBlur={draft.handleCountInputBlur}
                  className={`w-16 text-center ${inputCls}`}
                />
                <span className="text-sm text-surface-600 dark:text-surface-400">
                  {ui.count === 1 ? 'time' : 'times'}
                </span>
              </div>
            )}

            {ui.endMode === 'until' && (
              <button
                type="button"
                onClick={onOpenUntilPicker}
                className="flex h-9 w-full items-center gap-2 rounded-lg border border-transparent bg-surface-100 px-3 py-2 text-left text-sm transition-colors hover:border-surface-300 focus:border-primary-ink focus:bg-white focus:outline-hidden dark:bg-surface-700 dark:focus:bg-surface-800 dark:hover:border-surface-500"
              >
                {ui.until ? (
                  <Calendar className="h-4 w-4 shrink-0 text-surface-400" />
                ) : (
                  <CalendarPlus className="h-4 w-4 shrink-0 text-surface-400" />
                )}
                <span
                  className={
                    ui.until ? 'text-surface-700 dark:text-surface-300' : 'text-surface-400'
                  }
                >
                  {ui.until
                    ? formatDate(parseDateInputValue(ui.until) as Date, true, dateFormat)
                    : 'Set end date...'}
                </span>
              </button>
            )}
          </div>
        )}

        {draft.isRecurring && (
          <div className="space-y-2">
            <p className="text-surface-500 text-xs dark:text-surface-400">Schedule next task</p>
            <div className="flex gap-2">
              {(
                [
                  { value: 0, label: 'From due date' },
                  { value: 1, label: 'After completion' },
                ] as const
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={draft.localRepeatFrom === value}
                  onClick={() => draft.setLocalRepeatFrom(value)}
                  className={`${btnBase} ${draft.localRepeatFrom === value ? btnActive : btnInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto">
          <RepeatRuleSummary
            rrule={draft.draftRrule}
            repeatFrom={draft.localRepeatFrom}
            dueDate={dueDate}
            dateFormat={dateFormat}
          />
        </div>
      </div>
    </div>
  );
};
