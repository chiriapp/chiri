import {
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
import CalendarIcon from 'lucide-react/icons/calendar';
import ChevronLeft from 'lucide-react/icons/chevron-left';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Clock from 'lucide-react/icons/clock';
import Sun from 'lucide-react/icons/sun';
import X from 'lucide-react/icons/x';
import { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '@/context/settingsContext';
import {
  createAllDayDate,
  createPaddedDaysArray,
  getDaysOfWeekLabels,
  getMonthStartPadding,
  getWeekStartValue,
  setDateTime,
  updateTimeComponent,
} from '@/utils/calendar';

interface DateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined, allDay?: boolean) => void;
  placeholder?: string;
  showTime?: boolean;
  allDay?: boolean; // external all-day state
  onAllDayChange?: (allDay: boolean) => void; // callback for all-day toggle
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Select date...',
  showTime = true,
  allDay = false,
  onAllDayChange,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const [selectedTime, setSelectedTime] = useState(() => {
    if (value && !allDay) {
      return {
        hours: value.getHours(),
        minutes: value.getMinutes(),
      };
    }
    return { hours: 12, minutes: 0 };
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const { startOfWeek: weekStartsSetting } = useSettingsStore();
  const weekStartsOn = getWeekStartValue(weekStartsSetting);
  const daysOfWeek = getDaysOfWeekLabels(weekStartsOn);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // pad start of month based on week start setting
  const firstDayOfMonth = monthStart.getDay();
  const startPadding = getMonthStartPadding(firstDayOfMonth, weekStartsOn);
  const paddedDays = createPaddedDaysArray(days, startPadding);

  const handleDayClick = (day: Date) => {
    const newDate = allDay
      ? createAllDayDate(day)
      : setDateTime(day, selectedTime.hours, selectedTime.minutes);
    onChange(newDate, allDay);
  };

  const handleTimeChange = (type: 'hours' | 'minutes', newValue: number) => {
    const newTime = updateTimeComponent(selectedTime, type, newValue);
    setSelectedTime(newTime);

    if (value !== undefined) {
      const newDate = setDateTime(value, newTime.hours, newTime.minutes);
      onChange(newDate, allDay);
    }
  };

  const handleAllDayToggle = () => {
    const newAllDay = !allDay;
    onAllDayChange?.(newAllDay);

    if (value) {
      const newDate = newAllDay
        ? createAllDayDate(value)
        : setDateTime(value, selectedTime.hours, selectedTime.minutes);
      onChange(newDate, newAllDay);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined, false);
    onAllDayChange?.(false);
    setIsOpen(false);
  };

  const formatDisplayValue = () => {
    if (!value) return placeholder;
    if (allDay) {
      return `${format(value, 'MMM d, yyyy')} (All day)`;
    }
    if (showTime) {
      return format(value, 'MMM d, yyyy h:mm a');
    }
    return format(value, 'MMM d, yyyy');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg hover:border-surface-300 dark:hover:border-surface-500 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/50 transition-colors"
      >
        <CalendarIcon className="w-4 h-4 text-surface-400 flex-shrink-0" />
        <span className={value ? 'text-surface-700 dark:text-surface-300' : 'text-surface-400'}>
          {formatDisplayValue()}
        </span>
        {value && (
          <X
            className="w-4 h-4 ml-auto text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 flex-shrink-0"
            onClick={handleClear}
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-lg animate-scale-in w-[280px]">
          <div className="flex items-center justify-between p-3 border-b border-surface-200 dark:border-surface-700">
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

          <div className="grid grid-cols-7 gap-1 px-2 py-2 border-b border-surface-200 dark:border-surface-700">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-surface-500 dark:text-surface-400"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 p-2">
            {paddedDays.map((day, _) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${currentMonth.getDay()}-${currentMonth.getMonth()}-${currentMonth.getFullYear()}`}
                  />
                );
              }

              const isSelected = value && isSameDay(day, value);
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
                      isSelected
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

          {showTime && (
            <div className="p-3 border-t border-surface-200 dark:border-surface-700 space-y-3">
              {/* All Day Toggle */}
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-surface-400" />
                <span className="text-sm text-surface-600 dark:text-surface-400">All day</span>
                <button
                  type="button"
                  onClick={handleAllDayToggle}
                  className={`ml-auto relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    allDay ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      allDay ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Time Picker - hidden when all day */}
              {!allDay && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-surface-400" />
                  <span className="text-sm text-surface-600 dark:text-surface-400">Time</span>
                  <div className="flex-1 flex items-center justify-end gap-1">
                    <select
                      value={selectedTime.hours}
                      onChange={(e) => handleTimeChange('hours', parseInt(e.target.value, 10))}
                      className="px-2 py-1 text-sm bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-700 dark:text-surface-300 focus:outline-none focus:border-primary-300"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: Hour options are static and order is stable
                        <option key={`hour-${i}`} value={i}>
                          {i.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <span className="text-surface-500">:</span>
                    <select
                      value={selectedTime.minutes}
                      onChange={(e) => handleTimeChange('minutes', parseInt(e.target.value, 10))}
                      className="px-2 py-1 text-sm bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-700 dark:text-surface-300 focus:outline-none focus:border-primary-300"
                    >
                      {Array.from({ length: 60 }, (_, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: Minute options are static and order is stable
                        <option key={`minute-${i}`} value={i}>
                          {i.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 p-3 border-t border-surface-200 dark:border-surface-700">
            <button
              type="button"
              onClick={() => {
                const now = allDay ? createAllDayDate(new Date()) : new Date();
                onChange(now, allDay);
                setIsOpen(false);
              }}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const date = allDay
                  ? createAllDayDate(tomorrow)
                  : setDateTime(tomorrow, selectedTime.hours, selectedTime.minutes);
                onChange(date, allDay);
                setIsOpen(false);
              }}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded transition-colors"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                const date = allDay
                  ? createAllDayDate(nextWeek)
                  : setDateTime(nextWeek, selectedTime.hours, selectedTime.minutes);
                onChange(date, allDay);
                setIsOpen(false);
              }}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded transition-colors"
            >
              Next week
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
