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
import { type ComponentType, type PointerEvent, useRef, useState } from 'react';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { TimePickerModal } from '$components/modals/TimePickerModal';
import { DEFAULT_TIME } from '$constants';
import { settingsStore } from '$context/settingsContext';
import { useDatePickerKeyboardNavigation } from '$hooks/ui/useDatePickerKeyboardNavigation';
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
  Icon: ComponentType<{ className?: string }>;
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
  const presetListRef = useRef<HTMLDivElement>(null);
  const calendarGridAreaRef = useRef<HTMLDivElement>(null);

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

  useDatePickerKeyboardNavigation({
    enabled: isOpen && !showCustomModal,
    presetListRef,
    calendarGridRef: calendarGridAreaRef,
    currentMonth,
    preferredDate: localValue,
    onPreviousMonth: () => setCurrentMonth((month) => subMonths(month, 1)),
    onNextMonth: () => setCurrentMonth((month) => addMonths(month, 1)),
    onCalendarMonthChange: setCurrentMonth,
  });

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

  const minutesToTimeLabel = (minutes: number) => {
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

  const handleCalendarGridAreaPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLElement && event.target.closest('button')) return;
    event.currentTarget.focus({ preventScroll: true });
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
    `w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset data-[keyboard-navigation-focus=true]:ring-2 data-[keyboard-navigation-focus=true]:ring-primary-500 data-[keyboard-navigation-focus=true]:ring-inset ${
      active
        ? 'bg-primary-500 text-primary-contrast'
        : 'text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600'
    }`;

  const clearButton =
    localValue || initialValue ? (
      <ModalButton
        variant="ghost"
        onClick={handleClear}
        className="text-surface-500 hover:bg-semantic-error/10 hover:text-semantic-error dark:text-surface-400"
      >
        Clear
      </ModalButton>
    ) : null;

  return (
    <>
      <ModalWrapper
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        className="max-w-120"
        zIndex="z-70"
        contentPadding={false}
        initialFocus="dialog"
        footerLeft={clearButton}
        footer={
          <>
            <ModalButton variant="ghost" onClick={onClose}>
              Cancel
            </ModalButton>
            <ModalButton onClick={handleSave} disabled={!localValue && !initialValue}>
              {value ? 'Save' : 'Add Reminder'}
            </ModalButton>
          </>
        }
      >
        <div className="flex">
          <div
            ref={presetListRef}
            className="flex w-44 flex-col gap-2 border-surface-200 border-r p-4 dark:border-surface-700"
          >
            <div className="flex flex-col gap-1.5">
              {CATEGORY_PRESETS.map(({ id, Icon }) => {
                const minutes = quickTimePresets[id];
                const active = timeSelected && selectedMinutes === minutes && !isCustomTime;
                return (
                  <button
                    key={id}
                    type="button"
                    data-vertical-list-item
                    onClick={() => handlePresetTimeSelect(minutes)}
                    className={btnClass(active)}
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
                  onClick={handleOpenCustomModal}
                  className={btnClass(isCustomTime)}
                >
                  <Clock className="h-3 w-3" />
                  {isCustomTime ? minutesToTimeLabel(selectedMinutes) : 'Custom time'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 border-surface-200 border-t pt-2 dark:border-surface-700">
              <button
                type="button"
                data-vertical-list-item
                onClick={() => handleQuickSelect(today)}
                className={btnClass(isQuickToday)}
              >
                <CalendarDays className="h-3 w-3" />
                Today
              </button>
              <button
                type="button"
                data-vertical-list-item
                onClick={() => handleQuickSelect(addDays(today, 1))}
                className={btnClass(isQuickTomorrow)}
              >
                <ArrowRight className="h-3 w-3" />
                Tomorrow
              </button>
              <button
                type="button"
                data-vertical-list-item
                onClick={() => handleQuickSelect(addDays(today, 7))}
                className={btnClass(isQuickNextWeek)}
              >
                <ChevronsRight className="h-3 w-3" />
                Next week
              </button>
            </div>
          </div>

          <div className="flex-1 p-4">
            <div className="mb-3 min-h-8">
              {selectedDateLabel ? (
                <div className="flex items-baseline gap-2">
                  <p className="font-medium text-sm text-surface-800 dark:text-surface-200">
                    {selectedDateLabel}
                  </p>
                  {selectedTimeLabel && (
                    <p className="text-surface-500 text-xs dark:text-surface-400">
                      {selectedTimeLabel}
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
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="rounded-sm p-1 text-surface-600 outline-hidden transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-700"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="font-medium text-sm text-surface-800 dark:text-surface-200">
                {formatMonthYear(currentMonth)}
              </span>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="rounded-sm p-1 text-surface-600 outline-hidden transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-700"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div
              ref={calendarGridAreaRef}
              tabIndex={-1}
              onPointerDown={handleCalendarGridAreaPointerDown}
              className="outline-hidden"
            >
              <div className="mb-2 grid grid-cols-7 gap-1">
                {daysOfWeek.map((day) => (
                  <div
                    key={day}
                    className="text-center font-medium text-surface-500 text-xs dark:text-surface-400"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {paddedDays.map((day, index) => {
                  if (!day) {
                    // empty calendar grid cells reserve row height for shorter months
                    // biome-ignore lint/suspicious/noArrayIndexKey: padding cells have no identity; index represents stable grid position
                    return <div key={index} className="h-8" />;
                  }
                  const isSelected = localValue && isSameDay(day, localValue);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isTodayDate = isToday(day);
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      data-calendar-day-time={day.getTime()}
                      onClick={() => handleDayClick(day)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset data-[keyboard-navigation-focus=true]:ring-2 data-[keyboard-navigation-focus=true]:ring-primary-500 data-[keyboard-navigation-focus=true]:ring-inset ${
                        isSelected
                          ? 'bg-primary-500 text-primary-contrast'
                          : isTodayDate
                            ? 'bg-primary-500/15 font-medium text-primary-500'
                            : isCurrentMonth
                              ? 'text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700'
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
        </div>
      </ModalWrapper>

      <TimePickerModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onConfirm={handleCustomTimeConfirm}
        initialHour={customHour}
        initialMinute={customMinute}
        title="Custom time"
      />
    </>
  );
};
