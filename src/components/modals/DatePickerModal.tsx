import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from 'date-fns';
import ArrowRight from 'lucide-react/icons/arrow-right';
import Ban from 'lucide-react/icons/ban';
import CalendarDays from 'lucide-react/icons/calendar-days';
import ChevronLeft from 'lucide-react/icons/chevron-left';
import ChevronRight from 'lucide-react/icons/chevron-right';
import ChevronsRight from 'lucide-react/icons/chevrons-right';
import Clock from 'lucide-react/icons/clock';
import Moon from 'lucide-react/icons/moon';
import Sun from 'lucide-react/icons/sun';
import Sunrise from 'lucide-react/icons/sunrise';
import Sunset from 'lucide-react/icons/sunset';
import X from 'lucide-react/icons/x';
import { useState } from 'react';
import { TimePickerModal } from '$components/modals/TimePickerModal';
import { DEFAULT_TIME } from '$constants';
import { settingsStore } from '$context/settingsContext';
import { useFocusTrap } from '$hooks/ui/useFocusTrap';
import { useModalEscapeKey } from '$hooks/ui/useModalEscapeKey';
import type { QuickTimePresets } from '$types/settings';
import {
  createAllDayDate,
  createPaddedDaysArray,
  getDaysOfWeekLabels,
  getMonthStartPadding,
  getWeekStartValue,
  setDateTime,
} from '$utils/calendar';
import { formatDate, formatMonthYear, formatTime } from '$utils/date';

const DEFAULT_QUICK_TIME_PRESETS: QuickTimePresets = {
  morning: 540,
  afternoon: 720,
  evening: 1020,
  night: 1260,
};

const CATEGORY_PRESETS: {
  id: keyof QuickTimePresets;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'morning', Icon: Sunrise },
  { id: 'afternoon', Icon: Sun },
  { id: 'evening', Icon: Sunset },
  { id: 'night', Icon: Moon },
];

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value?: Date;
  onChange: (date: Date | undefined, allDay?: boolean) => void;
  title: string;
  allDay?: boolean;
  onAllDayChange?: (allDay: boolean) => void;
  hideTimeControls?: boolean;
}

export const DatePickerModal = ({
  isOpen,
  onClose,
  value,
  onChange,
  title,
  allDay = false,
  onAllDayChange,
  hideTimeControls = false,
}: DatePickerModalProps) => {
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const [localValue, setLocalValue] = useState<Date | undefined>(value);
  const [initialValue, setInitialValue] = useState<Date | undefined>(value);
  const [selectedTime, setSelectedTime] = useState(() => {
    if (value && !allDay) {
      return { hours: value.getHours(), minutes: value.getMinutes() };
    }
    return DEFAULT_TIME;
  });
  // localNoTime maps to the iCal DATE type (no time component), equivalent to what was "allDay"
  // defaults to true when no existing value (date-only is the common case for tasks)
  const [localNoTime, setLocalNoTime] = useState(!value || allDay);
  // true only when the user has explicitly chosen a time (not just the default)
  const [timeSelected, setTimeSelected] = useState(() => !!value && !allDay);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customHour, setCustomHour] = useState(0);
  const [customMinute, setCustomMinute] = useState(0);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setLocalValue(value);
      setInitialValue(value);
      setLocalNoTime(!value || allDay);
      setTimeSelected(!!value && !allDay);
      if (value && !allDay) {
        setSelectedTime({ hours: value.getHours(), minutes: value.getMinutes() });
      } else {
        setSelectedTime(DEFAULT_TIME);
      }
    }
  }

  const focusTrapRef = useFocusTrap(isOpen);
  useModalEscapeKey(onClose, { enabled: !showCustomModal });
  useModalEscapeKey(() => setShowCustomModal(false), { enabled: showCustomModal });

  if (!isOpen) return null;

  const { startOfWeek: weekStartsSetting, quickTimePresets: storedPresets } =
    settingsStore.getState();
  const quickTimePresets =
    storedPresets && !Array.isArray(storedPresets) ? storedPresets : DEFAULT_QUICK_TIME_PRESETS;
  const weekStartsOn = getWeekStartValue(weekStartsSetting);
  const daysOfWeek = getDaysOfWeekLabels(weekStartsOn);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getMonthStartPadding(monthStart.getDay(), weekStartsOn);
  const paddedDays = createPaddedDaysArray(days, startPadding);

  const minutesToTimeLabel = (minutes: number): string => {
    const d = new Date();
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return formatTime(d);
  };

  const selectedMinutes = selectedTime.hours * 60 + selectedTime.minutes;
  const isCustomTime =
    timeSelected &&
    !localNoTime &&
    !CATEGORY_PRESETS.some(({ id }) => quickTimePresets[id] === selectedMinutes);

  const today = new Date();
  const isQuickToday = localValue ? isSameDay(localValue, today) : false;
  const isQuickTomorrow = localValue ? isSameDay(localValue, addDays(today, 1)) : false;
  const isQuickNextWeek = localValue ? isSameDay(localValue, addDays(today, 7)) : false;

  const selectedDateLabel = localValue
    ? `${format(localValue, 'EEEE')}, ${formatDate(localValue, true)}`
    : null;
  const selectedTimeLabel =
    localValue && !localNoTime && timeSelected ? formatTime(localValue) : null;

  const handleDayClick = (day: Date) => {
    setLocalValue(
      localNoTime
        ? createAllDayDate(day)
        : setDateTime(day, selectedTime.hours, selectedTime.minutes),
    );
  };

  const handlePresetTimeSelect = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    setSelectedTime({ hours, minutes: mins });
    setLocalNoTime(false);
    setTimeSelected(true);
    if (localValue !== undefined) {
      setLocalValue(setDateTime(localValue, hours, mins));
    }
  };

  const handleNoTimeToggle = () => {
    const next = !localNoTime;
    setLocalNoTime(next);
    if (localValue) {
      setLocalValue(
        next
          ? createAllDayDate(localValue)
          : setDateTime(localValue, selectedTime.hours, selectedTime.minutes),
      );
    }
  };

  const handleQuickSelect = (date: Date) => {
    setLocalValue(
      localNoTime
        ? createAllDayDate(date)
        : setDateTime(date, selectedTime.hours, selectedTime.minutes),
    );
    setCurrentMonth(date);
  };

  const handleOpenCustomModal = () => {
    const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);
    setCustomHour(oneHourLater.getHours());
    setCustomMinute(oneHourLater.getMinutes());
    setShowCustomModal(true);
  };

  const handleCustomTimeConfirm = (hour: number, minute: number) => {
    const newTime = { hours: hour, minutes: minute };
    setSelectedTime(newTime);
    setLocalNoTime(false);
    setTimeSelected(true);
    if (localValue !== undefined) {
      setLocalValue(setDateTime(localValue, newTime.hours, newTime.minutes));
    }
    setShowCustomModal(false);
  };

  const handleClear = () => {
    onChange(undefined, false);
    onAllDayChange?.(false);
    setLocalValue(undefined);
  };

  const handleDone = () => {
    onChange(localValue, localNoTime);
    onAllDayChange?.(localNoTime);
    onClose();
  };

  const btnClass = (active: boolean) =>
    `w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
      active
        ? 'bg-primary-600 text-primary-contrast'
        : 'text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600'
    }`;

  const showBorderAboveQuickSelects = !hideTimeControls;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop does not require keyboard handler; ESC key closes modal via useModalEscapeKey hook
    // biome-ignore lint/a11y/useKeyWithClickEvents: Modal backdrop is non-interactive; users close with Escape or X button
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={focusTrapRef}
        className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-[480px] animate-scale-in"
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex">
          <div className="w-44 p-4 flex flex-col gap-2 border-r border-surface-200 dark:border-surface-700">
            {!hideTimeControls && (
              <div className="flex flex-col gap-1.5">
                {CATEGORY_PRESETS.map(({ id, Icon }) => {
                  const minutes = quickTimePresets[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handlePresetTimeSelect(minutes)}
                      className={btnClass(
                        timeSelected && !localNoTime && selectedMinutes === minutes,
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {minutesToTimeLabel(minutes)}
                    </button>
                  );
                })}

                <div className="pt-2 border-t border-surface-200 dark:border-surface-700">
                  <button
                    type="button"
                    onClick={handleOpenCustomModal}
                    className={btnClass(isCustomTime)}
                  >
                    <Clock className="w-3 h-3" />
                    {isCustomTime ? minutesToTimeLabel(selectedMinutes) : 'Custom time'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleNoTimeToggle}
                  className={btnClass(localNoTime)}
                >
                  <Ban className="w-3 h-3" />
                  No time
                </button>
              </div>
            )}

            <div
              className={`flex flex-col gap-1.5 ${showBorderAboveQuickSelects ? 'pt-2 border-t border-surface-200 dark:border-surface-700' : ''}`}
            >
              <button
                type="button"
                onClick={() => handleQuickSelect(today)}
                className={btnClass(isQuickToday)}
              >
                <CalendarDays className="w-3 h-3" />
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(addDays(today, 1))}
                className={btnClass(isQuickTomorrow)}
              >
                <ArrowRight className="w-3 h-3" />
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(addDays(today, 7))}
                className={btnClass(isQuickNextWeek)}
              >
                <ChevronsRight className="w-3 h-3" />
                Next week
              </button>
            </div>
          </div>

          <div className="flex-1 p-4">
            <div className="mb-3 min-h-[2rem]">
              {selectedDateLabel ? (
                <div className="flex items-baseline gap-2">
                  <p className="text-sm font-medium text-surface-800 dark:text-surface-200">
                    {selectedDateLabel}
                  </p>
                  {selectedTimeLabel && (
                    <p className="text-xs text-surface-500 dark:text-surface-400">
                      {selectedTimeLabel}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-surface-400 dark:text-surface-500">No date selected</p>
              )}
            </div>

            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-surface-800 dark:text-surface-200">
                {formatMonthYear(currentMonth)}
              </span>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map((day, idx) => (
                <div
                  key={`day-${idx}-${day}`}
                  className="text-center text-xs font-medium text-surface-500 dark:text-surface-400"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {paddedDays.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}-${day}`} />;
                }
                const isLocalSelected = localValue && isSameDay(day, localValue);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={`
                      w-8 h-8 rounded-full text-sm flex items-center justify-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset
                      ${
                        isLocalSelected
                          ? 'bg-primary-600 text-primary-contrast'
                          : isTodayDate
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                            : isCurrentMonth
                              ? 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
                              : 'text-surface-400 dark:text-surface-600'
                      }
                    `}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-surface-200 dark:border-surface-700">
          <div>
            {(localValue || initialValue) && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 text-sm font-medium text-surface-500 dark:text-surface-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDone}
              disabled={!localValue && !initialValue}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                localValue || initialValue
                  ? 'text-primary-contrast bg-primary-600 hover:bg-primary-700'
                  : 'text-surface-400 dark:text-surface-600 bg-surface-200 dark:bg-surface-700 cursor-not-allowed'
              }`}
            >
              Done
            </button>
          </div>
        </div>
      </div>

      <TimePickerModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onConfirm={handleCustomTimeConfirm}
        initialHour={customHour}
        initialMinute={customMinute}
        title="Custom time"
      />
    </div>
  );
};
