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
import ChevronLeft from 'lucide-react/icons/chevron-left';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Clock from 'lucide-react/icons/clock';
import Sun from 'lucide-react/icons/sun';
import Trash2 from 'lucide-react/icons/trash-2';
import X from 'lucide-react/icons/x';
import { useEffect, useState } from 'react';
import { settingsStore } from '$context/settingsContext';
import { useFocusTrap } from '$hooks/useFocusTrap';
import { useModalEscapeKey } from '$hooks/useModalEscapeKey';
import {
  createAllDayDate,
  createPaddedDaysArray,
  getDaysOfWeekLabels,
  getMonthStartPadding,
  getWeekStartValue,
  setDateTime,
  updateTimeComponent,
} from '$utils/calendar';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value?: Date;
  onChange: (date: Date | undefined, allDay?: boolean) => void;
  title: string;
  allDay?: boolean;
  onAllDayChange?: (allDay: boolean) => void;
}

export const DatePickerModal = ({
  isOpen,
  onClose,
  value,
  onChange,
  title,
  allDay = false,
  onAllDayChange,
}: DatePickerModalProps) => {
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const [localValue, setLocalValue] = useState<Date | undefined>(value);
  const [initialValue, setInitialValue] = useState<Date | undefined>(value);
  const [selectedTime, setSelectedTime] = useState(() => {
    if (value && !allDay) {
      return {
        hours: value.getHours(),
        minutes: value.getMinutes(),
      };
    }
    return { hours: 12, minutes: 0 };
  });
  const [localAllDay, setLocalAllDay] = useState(allDay);

  // Sync local state when modal opens or value changes
  useEffect(() => {
    if (isOpen) {
      setLocalValue(value);
      setInitialValue(value);
      setLocalAllDay(allDay);
      if (value && !allDay) {
        setSelectedTime({
          hours: value.getHours(),
          minutes: value.getMinutes(),
        });
      }
    }
  }, [isOpen, value, allDay]);

  const focusTrapRef = useFocusTrap(isOpen);

  // Handle ESC key to close modal
  useModalEscapeKey(onClose);

  if (!isOpen) return null;

  const { startOfWeek: weekStartsSetting } = settingsStore.getState();
  const weekStartsOn = getWeekStartValue(weekStartsSetting);
  const daysOfWeek = getDaysOfWeekLabels(weekStartsOn);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of month based on week start setting
  const firstDayOfMonth = monthStart.getDay();
  const startPadding = getMonthStartPadding(firstDayOfMonth, weekStartsOn);
  const paddedDays = createPaddedDaysArray(days, startPadding);

  const handleDayClick = (day: Date) => {
    const newDate = localAllDay
      ? createAllDayDate(day)
      : setDateTime(day, selectedTime.hours, selectedTime.minutes);
    setLocalValue(newDate);
  };

  const handleTimeChange = (type: 'hours' | 'minutes', newValue: number) => {
    const newTime = updateTimeComponent(selectedTime, type, newValue);
    setSelectedTime(newTime);

    if (localValue !== undefined) {
      const newDate = setDateTime(localValue, newTime.hours, newTime.minutes);
      setLocalValue(newDate);
    }
  };

  const handleAllDayToggle = () => {
    const newAllDay = !localAllDay;
    setLocalAllDay(newAllDay);

    if (localValue) {
      const newDate = newAllDay
        ? createAllDayDate(localValue)
        : setDateTime(localValue, selectedTime.hours, selectedTime.minutes);
      setLocalValue(newDate);
    }
  };

  const handleQuickSelect = (date: Date) => {
    const newDate = localAllDay
      ? createAllDayDate(date)
      : setDateTime(date, selectedTime.hours, selectedTime.minutes);
    onChange(newDate, localAllDay);
    onClose();
  };

  const handleClear = () => {
    setLocalValue(undefined);
    setLocalAllDay(false);
  };

  const handleDone = () => {
    onChange(localValue, localAllDay);
    onAllDayChange?.(localAllDay);
    onClose();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop does not require keyboard handler; ESC key closes modal via useModalEscapeKey hook
    // biome-ignore lint/a11y/useKeyWithClickEvents: Modal backdrop is non-interactive; users close with Escape or X button
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={focusTrapRef}
        className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-xs animate-scale-in"
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">{title}</h2>
          <div className="flex items-center gap-1">
            {localValue && (
              <button
                type="button"
                onClick={handleClear}
                className="p-2 text-surface-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                title="Clear date"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* Quick select buttons */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => handleQuickSelect(new Date())}
              className="flex-1 px-3 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(addDays(new Date(), 1))}
              className="flex-1 px-3 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(addDays(new Date(), 7))}
              className="flex-1 px-3 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors"
            >
              Next week
            </button>
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-surface-800 dark:text-surface-200">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Days of week header */}
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

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1 mb-4">
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
                    w-8 h-8 rounded-full text-sm flex items-center justify-center transition-colors
                    ${
                      isLocalSelected
                        ? 'bg-primary-600 text-white'
                        : isTodayDate
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                          : isCurrentMonth
                            ? 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
                            : 'text-surface-400 dark:text-surface-600'
                    }
                  `}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-2 py-3 border-t border-surface-200 dark:border-surface-700">
            <Sun className="w-4 h-4 text-surface-400" />
            <span className="text-sm text-surface-600 dark:text-surface-400">All day</span>
            <button
              type="button"
              onClick={handleAllDayToggle}
              className={`ml-auto relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                localAllDay ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  localAllDay ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Time Picker - hidden when all day */}
          {!localAllDay && (
            <div className="flex items-center gap-2 py-3 border-t border-surface-200 dark:border-surface-700">
              <Clock className="w-4 h-4 text-surface-400" />
              <span className="text-sm text-surface-600 dark:text-surface-400">Time</span>
              <div className="flex-1 flex items-center justify-end gap-1">
                <select
                  value={selectedTime.hours}
                  onChange={(e) => handleTimeChange('hours', parseInt(e.target.value, 10))}
                  className="px-2 py-1 text-sm bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-700 dark:text-surface-300 focus:outline-none focus:border-primary-300"
                  aria-label="Select hour"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={`hour-${selectedTime.hours}-${i}`} value={i}>
                      {i.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <span className="text-surface-500">:</span>
                <select
                  value={selectedTime.minutes}
                  onChange={(e) => handleTimeChange('minutes', parseInt(e.target.value, 10))}
                  className="px-2 py-1 text-sm bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-700 dark:text-surface-300 focus:outline-none focus:border-primary-300"
                  aria-label="Select minute"
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={`minute-${selectedTime.minutes}-${i}`} value={i}>
                      {i.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-surface-200 dark:border-surface-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDone}
            disabled={!localValue && !initialValue}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              localValue || initialValue
                ? 'text-white bg-primary-600 hover:bg-primary-700'
                : 'text-surface-400 dark:text-surface-600 bg-surface-200 dark:bg-surface-700 cursor-not-allowed'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
