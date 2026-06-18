import ChevronDown from 'lucide-react/icons/chevron-down';
import ChevronUp from 'lucide-react/icons/chevron-up';
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ModalWrapper } from '$components/ModalWrapper';

interface TimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (hour: number, minute: number) => void;
  initialHour?: number;
  initialMinute?: number;
  title?: string;
  description?: string;
}

export const TimePickerModal = ({
  isOpen,
  onClose,
  onConfirm,
  initialHour = 0,
  initialMinute = 0,
  title = 'Select time',
  description,
}: TimePickerModalProps) => {
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const [hourInput, setHourInput] = useState(initialHour.toString().padStart(2, '0'));
  const [minuteInput, setMinuteInput] = useState(initialMinute.toString().padStart(2, '0'));
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hourInputRef = useRef<HTMLInputElement>(null);
  const minuteInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens with new initial values
  useEffect(() => {
    if (isOpen) {
      setHour(initialHour);
      setMinute(initialMinute);
      setHourInput(initialHour.toString().padStart(2, '0'));
      setMinuteInput(initialMinute.toString().padStart(2, '0'));
    }
  }, [isOpen, initialHour, initialMinute]);

  const incrementHour = useCallback(() => setHour((h) => (h + 1) % 24), []);
  const decrementHour = useCallback(() => setHour((h) => (h - 1 + 24) % 24), []);
  const incrementMinute = useCallback(() => setMinute((m) => (m + 1) % 60), []);
  const decrementMinute = useCallback(() => setMinute((m) => (m - 1 + 60) % 60), []);

  // Sync input fields with actual values only when not focused
  useEffect(() => {
    if (document.activeElement !== hourInputRef.current) {
      setHourInput(hour.toString().padStart(2, '0'));
    }
  }, [hour]);

  useEffect(() => {
    if (document.activeElement !== minuteInputRef.current) {
      setMinuteInput(minute.toString().padStart(2, '0'));
    }
  }, [minute]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    };
  }, []);

  const startHold = (action: () => void) => {
    action();
    holdTimeoutRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(action, 80);
    }, 250);
  };

  const stopHold = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const handleHourInputChange = (value: string) => {
    const filtered = value.replace(/\D/g, '').slice(0, 2);
    setHourInput(filtered);
    const parsed = parseInt(filtered, 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 23) {
      setHour(parsed);
    }
  };

  const handleHourInputBlur = () => {
    const parsed = parseInt(hourInput, 10);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 23) {
      setHourInput(hour.toString().padStart(2, '0'));
    } else {
      setHour(parsed);
      setHourInput(parsed.toString().padStart(2, '0'));
    }
  };

  const handleHourKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newHour = (hour + 1) % 24;
      setHour(newHour);
      setHourInput(newHour.toString().padStart(2, '0'));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newHour = (hour - 1 + 24) % 24;
      setHour(newHour);
      setHourInput(newHour.toString().padStart(2, '0'));
    }
  };

  const handleMinuteInputChange = (value: string) => {
    const filtered = value.replace(/\D/g, '').slice(0, 2);
    setMinuteInput(filtered);
    const parsed = parseInt(filtered, 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 59) {
      setMinute(parsed);
    }
  };

  const handleMinuteInputBlur = () => {
    const parsed = parseInt(minuteInput, 10);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 59) {
      setMinuteInput(minute.toString().padStart(2, '0'));
    } else {
      setMinute(parsed);
      setMinuteInput(parsed.toString().padStart(2, '0'));
    }
  };

  const handleMinuteKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newMinute = (minute + 1) % 60;
      setMinute(newMinute);
      setMinuteInput(newMinute.toString().padStart(2, '0'));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newMinute = (minute - 1 + 60) % 60;
      setMinute(newMinute);
      setMinuteInput(newMinute.toString().padStart(2, '0'));
    }
  };

  const handleConfirm = () => {
    onConfirm(hour, minute);
  };

  if (!isOpen) return null;

  return (
    <ModalWrapper size="sm" onClose={onClose} title={title} description={description} zIndex="z-70">
      <div className="flex items-center justify-center gap-2">
        {/* Hour control */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onMouseDown={() => startHold(incrementHour)}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            className="flex w-14 select-none items-center justify-center rounded-lg p-3 text-surface-600 outline-hidden transition-colors hover:bg-surface-200 hover:text-primary-600 focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-primary-400"
            aria-label="Increment hour"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <input
            ref={hourInputRef}
            type="text"
            inputMode="numeric"
            value={hourInput}
            onChange={(e) => handleHourInputChange(e.target.value)}
            onBlur={handleHourInputBlur}
            onKeyDown={handleHourKeyDown}
            className="w-14 rounded-lg border border-surface-200 bg-surface-50 px-2 py-2 text-center font-bold text-2xl text-surface-800 tabular-nums outline-hidden focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-600 dark:bg-surface-700/50 dark:text-surface-200"
            aria-label="Hour"
          />
          <button
            type="button"
            onMouseDown={() => startHold(decrementHour)}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            className="flex w-14 select-none items-center justify-center rounded-lg p-3 text-surface-600 outline-hidden transition-colors hover:bg-surface-200 hover:text-primary-600 focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-primary-400"
            aria-label="Decrement hour"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        {/* Separator */}
        <span className="select-none font-bold text-2xl text-surface-400 dark:text-surface-500">
          :
        </span>

        {/* Minute control */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onMouseDown={() => startHold(incrementMinute)}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            className="flex w-14 select-none items-center justify-center rounded-lg p-3 text-surface-600 outline-hidden transition-colors hover:bg-surface-100 hover:text-primary-600 focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-primary-400"
            aria-label="Increment minute"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <input
            ref={minuteInputRef}
            type="text"
            inputMode="numeric"
            value={minuteInput}
            onChange={(e) => handleMinuteInputChange(e.target.value)}
            onBlur={handleMinuteInputBlur}
            onKeyDown={handleMinuteKeyDown}
            className="w-14 rounded-lg border border-surface-200 bg-surface-50 px-2 py-2 text-center font-bold text-2xl text-surface-800 tabular-nums outline-hidden focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-600 dark:bg-surface-700/50 dark:text-surface-200"
            aria-label="Minute"
          />
          <button
            type="button"
            onMouseDown={() => startHold(decrementMinute)}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            className="flex w-14 select-none items-center justify-center rounded-lg p-3 text-surface-600 outline-hidden transition-colors hover:bg-surface-100 hover:text-primary-600 focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-primary-400"
            aria-label="Decrement minute"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 font-medium text-sm text-surface-600 outline-hidden transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-primary-contrast text-sm outline-hidden transition-colors hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
        >
          Confirm
        </button>
      </div>
    </ModalWrapper>
  );
};
