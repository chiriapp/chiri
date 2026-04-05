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
      return { hours: value.getHours(), minutes: value.getMinutes() };
    }
    return DEFAULT_TIME;
  });
  const [timeSelected, setTimeSelected] = useState(true);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customHour, setCustomHour] = useState(0);
  const [customMinute, setCustomMinute] = useState(0);
  const focusTrapRef = useFocusTrap();

  useModalEscapeKey(onClose, { enabled: !showCustomModal });
  useModalEscapeKey(() => setShowCustomModal(false), { enabled: showCustomModal });

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setTimeSelected(true);
      if (value) {
        setLocalValue(value);
        setInitialValue(value);
        setCurrentMonth(new Date(value));
        setSelectedTime({ hours: value.getHours(), minutes: value.getMinutes() });
      } else {
        setLocalValue(undefined);
        setInitialValue(undefined);
        setCurrentMonth(new Date());
        setSelectedTime(DEFAULT_TIME);
      }
    }
  }

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
    timeSelected && !CATEGORY_PRESETS.some(({ id }) => quickTimePresets[id] === selectedMinutes);

  const today = new Date();
  const isQuickToday = localValue ? isSameDay(localValue, today) : false;
  const isQuickTomorrow = localValue ? isSameDay(localValue, addDays(today, 1)) : false;
  const isQuickNextWeek = localValue ? isSameDay(localValue, addDays(today, 7)) : false;

  const selectedDateLabel = localValue
    ? `${format(localValue, 'EEEE')}, ${formatDate(localValue, true)}`
    : null;
  const selectedTimeLabel = localValue && timeSelected ? formatTime(localValue) : null;

  const handleDayClick = (day: Date) => {
    setLocalValue(setDateTime(day, selectedTime.hours, selectedTime.minutes));
  };

  const handlePresetTimeSelect = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    setSelectedTime({ hours, minutes: mins });
    setTimeSelected(true);
    if (localValue !== undefined) {
      setLocalValue(setDateTime(localValue, hours, mins));
    }
  };

  const handleQuickSelect = (date: Date) => {
    const newDate = setDateTime(date, selectedTime.hours, selectedTime.minutes);
    setLocalValue(newDate);
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
    setTimeSelected(true);
    if (localValue !== undefined) {
      setLocalValue(setDateTime(localValue, hour, minute));
    }
    setShowCustomModal(false);
  };

  const handleClear = () => {
    onClear?.();
    setLocalValue(undefined);
  };

  const handleSave = () => {
    if (localValue) {
      onSave(localValue);
    } else if (initialValue && onClear) {
      onClear();
    }
    onClose();
  };

  const btnClass = (active: boolean) =>
    `w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
      active
        ? 'bg-primary-600 text-primary-contrast'
        : 'text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600'
    }`;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 animate-fade-in">
      <div
        ref={focusTrapRef}
        className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-120 animate-scale-in"
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex">
          <div className="w-44 p-4 flex flex-col gap-2 border-r border-surface-200 dark:border-surface-700">
            <div className="flex flex-col gap-1.5">
              {CATEGORY_PRESETS.map(({ id, Icon }) => {
                const minutes = quickTimePresets[id];
                const active = timeSelected && selectedMinutes === minutes && !isCustomTime;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handlePresetTimeSelect(minutes)}
                    className={btnClass(active)}
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
            </div>

            <div className="flex flex-col gap-1.5 pt-2 border-t border-surface-200 dark:border-surface-700">
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
            <div className="mb-3 min-h-8">
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
                className="p-1 rounded-sm hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-surface-800 dark:text-surface-200">
                {formatMonthYear(currentMonth)}
              </span>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1 rounded-sm hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

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

            <div className="grid grid-cols-7 gap-1">
              {paddedDays.map((day, index) => {
                if (!day) {
                  // Empty padding cells at start of calendar grid - index is stable based on month start day
                  // biome-ignore lint/suspicious/noArrayIndexKey: Padding cells have no identity; index represents stable grid position
                  return <div key={index} />;
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
                      w-8 h-8 rounded-full text-sm flex items-center justify-center transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset
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
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-surface-200 dark:border-surface-700">
          <div>
            {(localValue || initialValue) && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 text-sm font-medium text-surface-500 dark:text-surface-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!localValue && !initialValue}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
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
