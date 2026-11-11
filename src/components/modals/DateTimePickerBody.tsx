import { addDays, isSameDay, isSameMonth, isToday } from 'date-fns';
import ArrowRight from 'lucide-react/icons/arrow-right';
import Ban from 'lucide-react/icons/ban';
import Briefcase from 'lucide-react/icons/briefcase';
import CalendarDays from 'lucide-react/icons/calendar-days';
import ChevronLeft from 'lucide-react/icons/chevron-left';
import ChevronRight from 'lucide-react/icons/chevron-right';
import ChevronsRight from 'lucide-react/icons/chevrons-right';
import Clock from 'lucide-react/icons/clock';
import Moon from 'lucide-react/icons/moon';
import Sun from 'lucide-react/icons/sun';
import Sunrise from 'lucide-react/icons/sunrise';
import Sunset from 'lucide-react/icons/sunset';
import type { ComponentType } from 'react';
import { TimePickerModal } from '$components/modals/TimePickerModal';
import type { DateTimePickerDraft } from '$hooks/ui/useDateTimePickerDraft';
import type { QuickTimePresets } from '$types/settings/categories/scheduling';
import { formatMonthYear, minutesToTimeLabel } from '$utils/date';

interface DateTimePickerBodyProps {
  draft: DateTimePickerDraft;
  hideTimeControls?: boolean;
}

const CATEGORY_PRESETS: {
  id: keyof QuickTimePresets;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { id: 'morning', Icon: Sunrise },
  { id: 'afternoon', Icon: Sun },
  { id: 'evening', Icon: Sunset },
  { id: 'night', Icon: Moon },
];

const btnClass = (active: boolean) =>
  `w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset data-[keyboard-navigation-focus=true]:ring-2 data-[keyboard-navigation-focus=true]:ring-primary-ink data-[keyboard-navigation-focus=true]:ring-inset ${
    active
      ? 'bg-primary-500 text-primary-contrast'
      : 'text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600'
  }`;

const quickDateBtnClass = (matches: boolean, active: boolean, multipleMatches: boolean) =>
  `w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset data-[keyboard-navigation-focus=true]:ring-2 data-[keyboard-navigation-focus=true]:ring-primary-ink data-[keyboard-navigation-focus=true]:ring-inset ${
    matches && (active || !multipleMatches)
      ? 'bg-primary-500 text-primary-contrast'
      : matches && multipleMatches
        ? 'bg-primary-500/15 text-primary-ink dark:bg-primary-500/20 dark:text-primary-400'
        : 'text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600'
  }`;

const getDayButtonClass = (selected: boolean, today: boolean, currentMonth: boolean): string => {
  if (selected) return 'bg-primary-500 text-primary-contrast';
  if (today) return 'bg-primary-500/15 text-primary-ink font-medium';
  if (currentMonth)
    return 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700';
  return 'text-surface-400 dark:text-surface-600';
};

const hasMultipleQuickDateMatches = (draft: DateTimePickerDraft) =>
  [
    draft.isQuickToday,
    draft.isQuickTomorrow,
    draft.isQuickNextWorkingDay,
    draft.isQuickNextWeek,
  ].filter(Boolean).length > 1;

export const DateTimePickerBody = ({
  draft,
  hideTimeControls = false,
}: DateTimePickerBodyProps) => (
  <>
    <div className="flex">
      <div
        ref={draft.presetListRef}
        className="flex w-44 flex-col gap-2 border-surface-200 border-r p-4 dark:border-surface-700"
      >
        {!hideTimeControls && (
          <div className="flex flex-col gap-1.5">
            {CATEGORY_PRESETS.map(({ id, Icon }) => {
              const minutes = draft.quickTimePresets[id];
              return (
                <button
                  key={id}
                  type="button"
                  data-vertical-list-item
                  onClick={() => draft.handlePresetTimeSelect(minutes)}
                  className={btnClass(
                    draft.timeSelected && !draft.localNoTime && draft.selectedMinutes === minutes,
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {minutesToTimeLabel(minutes)}
                </button>
              );
            })}

            <div className="border-surface-200 border-t pt-2 dark:border-surface-700">
              <button
                type="button"
                data-vertical-list-item
                onClick={draft.handleOpenCustomModal}
                className={btnClass(draft.isCustomTime)}
              >
                <Clock className="h-3 w-3" />
                {draft.isCustomTime ? minutesToTimeLabel(draft.selectedMinutes) : 'Custom time'}
              </button>
            </div>

            {draft.supportsNoTime && (
              <button
                type="button"
                data-vertical-list-item
                onClick={draft.handleNoTimeToggle}
                className={btnClass(draft.localNoTime)}
              >
                <Ban className="h-3 w-3" />
                No time
              </button>
            )}
          </div>
        )}

        <div
          className={`flex flex-col gap-1.5 ${!hideTimeControls ? 'border-surface-200 border-t pt-2 dark:border-surface-700' : ''}`}
        >
          <button
            type="button"
            data-vertical-list-item
            onClick={() => draft.handleQuickSelect(draft.today, 'today')}
            className={quickDateBtnClass(
              draft.isQuickToday,
              draft.selectedQuickDatePreset === 'today',
              hasMultipleQuickDateMatches(draft),
            )}
          >
            <CalendarDays className="h-3 w-3" />
            Today
          </button>
          <button
            type="button"
            data-vertical-list-item
            onClick={() => draft.handleQuickSelect(addDays(draft.today, 1), 'tomorrow')}
            className={quickDateBtnClass(
              draft.isQuickTomorrow,
              draft.selectedQuickDatePreset === 'tomorrow',
              hasMultipleQuickDateMatches(draft),
            )}
          >
            <ArrowRight className="h-3 w-3" />
            Tomorrow
          </button>
          <button
            type="button"
            data-vertical-list-item
            onClick={() => draft.handleQuickSelect(draft.nextWorkingDay, 'next-working-day')}
            className={quickDateBtnClass(
              draft.isQuickNextWorkingDay,
              draft.selectedQuickDatePreset === 'next-working-day',
              hasMultipleQuickDateMatches(draft),
            )}
          >
            <Briefcase className="h-3 w-3" />
            Next working day
          </button>
          <button
            type="button"
            data-vertical-list-item
            onClick={() => draft.handleQuickSelect(addDays(draft.today, 7), 'next-week')}
            className={quickDateBtnClass(
              draft.isQuickNextWeek,
              draft.selectedQuickDatePreset === 'next-week',
              hasMultipleQuickDateMatches(draft),
            )}
          >
            <ChevronsRight className="h-3 w-3" />
            Next week
          </button>
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="mb-3 min-h-8">
          {draft.selectedDateLabel ? (
            <div className="flex items-baseline gap-2">
              <p className="font-medium text-sm text-surface-800 dark:text-surface-200">
                {draft.selectedDateLabel}
              </p>
              {draft.selectedTimeLabel && (
                <p className="text-surface-500 text-xs dark:text-surface-400">
                  {draft.selectedTimeLabel}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-surface-400 dark:text-surface-500">No date selected</p>
          )}
        </div>

        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={draft.handlePreviousMonth}
            className="rounded-sm p-1 text-surface-600 outline-hidden transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="font-medium text-sm text-surface-800 dark:text-surface-200">
            {formatMonthYear(draft.currentMonth)}
          </span>
          <button
            type="button"
            onClick={draft.handleNextMonth}
            className="rounded-sm p-1 text-surface-600 outline-hidden transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-700"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div
          ref={draft.calendarGridAreaRef}
          tabIndex={-1}
          onPointerDown={draft.handleCalendarGridAreaPointerDown}
          className="outline-hidden"
        >
          <div className="mb-2 grid grid-cols-7 gap-1">
            {draft.daysOfWeek.map((day) => (
              <div
                key={day}
                className="text-center font-medium text-surface-500 text-xs dark:text-surface-400"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 grid-rows-6 gap-1">
            {draft.days.map((day, index) => {
              const selected = !!(draft.localValue && isSameDay(day, draft.localValue));
              const currentMonth = isSameMonth(day, draft.currentMonth);
              const today = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  data-calendar-day-time={day.getTime()}
                  style={index === 0 ? { gridColumnStart: draft.startPadding + 1 } : undefined}
                  onClick={() => draft.handleDayClick(day)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset data-[keyboard-navigation-focus=true]:ring-2 data-[keyboard-navigation-focus=true]:ring-primary-ink data-[keyboard-navigation-focus=true]:ring-inset ${getDayButtonClass(selected, today, currentMonth)}`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>

    <TimePickerModal
      isOpen={draft.showCustomModal}
      onClose={draft.closeCustomModal}
      onConfirm={draft.handleCustomTimeConfirm}
      initialHour={draft.customHour}
      initialMinute={draft.customMinute}
      title="Custom time"
    />
  </>
);
