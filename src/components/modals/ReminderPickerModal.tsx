import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from 'date-fns';
import ChevronLeft from 'lucide-react/icons/chevron-left';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Clock from 'lucide-react/icons/clock';
import Trash2 from 'lucide-react/icons/trash-2';
import X from 'lucide-react/icons/x';
import { useState } from 'react';
import { AppSelect } from '$components/AppSelect';
import { settingsStore } from '$context/settingsContext';
import { useFocusTrap } from '$hooks/useFocusTrap';
import { useModalEscapeKey } from '$hooks/useModalEscapeKey';
import {
  createPaddedDaysArray,
  getDaysOfWeekLabels,
  getMonthStartPadding,
  getWeekStartValue,
  setDateTime,
  updateTimeComponent,
} from '$utils/calendar';
import { DEFAULT_TIME } from '$utils/constants';
import { formatMonthYear } from '$utils/date';

interface ReminderPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value?: Date;
  onSave: (date: Date) => void;
  onClear?: () => void;
  title?: string;
}

export const ReminderPickerModal = ({
  isOpen,
  onClose,
  value,
  onSave,
  onClear,
  title = 'Add Reminder',
}: ReminderPickerModalProps) => {
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const [localValue, setLocalValue] = useState<Date | undefined>(value);
  const [initialValue, setInitialValue] = useState<Date | undefined>(value);
  const [selectedTime, setSelectedTime] = useState(() => {
    if (value) {
      return {
        hours: value.getHours(),
        minutes: value.getMinutes(),
      };
    }
    return DEFAULT_TIME;
  });
  const focusTrapRef = useFocusTrap();

  // Handle ESC key to close modal
  useModalEscapeKey(onClose);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      if (value) {
        setLocalValue(value);
        setInitialValue(value);
        setCurrentMonth(new Date(value));
        setSelectedTime({
          hours: value.getHours(),
          minutes: value.getMinutes(),
        });
      } else {
        setLocalValue(undefined);
        setInitialValue(undefined);
        setCurrentMonth(new Date());
        setSelectedTime({ hours: 9, minutes: 0 });
      }
    }
  }

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
    const newDate = setDateTime(day, selectedTime.hours, selectedTime.minutes);
    setLocalValue(newDate);
  };

  const handleTimeChange = (type: 'hours' | 'minutes', newValue: number) => {
    const newTime = updateTimeComponent(selectedTime, type, newValue);
    setSelectedTime(newTime);

    if (localValue) {
      const newDate = setDateTime(localValue, newTime.hours, newTime.minutes);
      setLocalValue(newDate);
    }
  };

  const handleQuickSelect = (date: Date) => {
    const newDate = setDateTime(date, selectedTime.hours, selectedTime.minutes);
    onSave(newDate);
    onClose();
  };

  const handleClear = () => {
    setLocalValue(undefined);
  };

  const handleSave = () => {
    if (localValue) {
      onSave(localValue);
    } else if (initialValue && onClear) {
      // If we had a value initially but cleared it, delete the reminder
      onClear();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 animate-fade-in">
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
                className="p-2 text-surface-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                title="Clear date"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
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
              className="flex-1 px-3 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(addDays(new Date(), 1))}
              className="flex-1 px-3 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(addDays(new Date(), 7))}
              className="flex-1 px-3 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              Next week
            </button>
          </div>

          {/* Month navigation */}
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

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {daysOfWeek.map((day) => (
              <div
                key={day}
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

              const isSelected = localValue && isSameDay(day, localValue);
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
                      isSelected
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

          {/* Time Picker */}
          <div className="flex items-center gap-2 py-3 border-t border-surface-200 dark:border-surface-700">
            <Clock className="w-4 h-4 text-surface-400" />
            <span className="text-sm text-surface-600 dark:text-surface-400">Time</span>
            <div className="flex-1 flex items-center justify-end gap-1">
              <AppSelect
                value={selectedTime.hours}
                onChange={(e) => handleTimeChange('hours', parseInt(e.target.value, 10))}
                className="px-2 py-1 text-sm bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-700 dark:text-surface-300 outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={`hour-${selectedTime.hours}-${i}`} value={i}>
                    {i.toString().padStart(2, '0')}
                  </option>
                ))}
              </AppSelect>
              <span className="text-surface-500">:</span>
              <AppSelect
                value={selectedTime.minutes}
                onChange={(e) => handleTimeChange('minutes', parseInt(e.target.value, 10))}
                className="px-2 py-1 text-sm bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-700 dark:text-surface-300 outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={`minute-${selectedTime.minutes}-${i}`} value={i}>
                    {i.toString().padStart(2, '0')}
                  </option>
                ))}
              </AppSelect>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-surface-200 dark:border-surface-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!localValue && !initialValue}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-inset ${
              localValue || initialValue
                ? 'text-primary-contrast bg-primary-600 hover:bg-primary-700'
                : 'text-surface-400 dark:text-surface-600 bg-surface-200 dark:bg-surface-700 cursor-not-allowed'
            }`}
          >
            {value ? 'Save' : 'Add Reminder'}
          </button>
        </div>
      </div>
    </div>
  );
};
