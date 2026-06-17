import { addDays, addMonths, isSameMonth, startOfDay, startOfMonth } from 'date-fns';
import { type RefObject, useEffect, useEffectEvent, useRef } from 'react';

const KEYBOARD_FOCUS_ATTRIBUTE = 'data-keyboard-navigation-focus';
const PRESET_ITEM_SELECTOR = '[data-vertical-list-item]';

const isEditableElement = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
};

const isVisible = (element: HTMLElement) =>
  element.offsetParent !== null && window.getComputedStyle(element).visibility !== 'hidden';

const shouldIgnoreKeyboardEvent = (event: KeyboardEvent) =>
  event.defaultPrevented ||
  event.altKey ||
  event.ctrlKey ||
  event.metaKey ||
  event.shiftKey ||
  isEditableElement(event.target);

const clearKeyboardFocus = (container: HTMLElement) => {
  for (const item of container.querySelectorAll<HTMLElement>(`[${KEYBOARD_FOCUS_ATTRIBUTE}]`)) {
    item.removeAttribute(KEYBOARD_FOCUS_ATTRIBUTE);
  }
};

const clearAllKeyboardFocus = (...containers: Array<HTMLElement | null>) => {
  for (const container of containers) {
    if (container) clearKeyboardFocus(container);
  }
};

const focusKeyboardItem = (container: HTMLElement, item: HTMLElement) => {
  clearKeyboardFocus(container);
  item.setAttribute(KEYBOARD_FOCUS_ATTRIBUTE, 'true');
  item.focus({ preventScroll: true });
};

const getPresetItems = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(PRESET_ITEM_SELECTOR)).filter(
    (item) => !item.hasAttribute('disabled') && isVisible(item),
  );

const canNavigatePresetList = (container: HTMLElement, activeElement: Element | null) => {
  const dialog = container.closest('[role="dialog"]');
  return (
    activeElement === dialog ||
    (activeElement instanceof HTMLElement && container.contains(activeElement))
  );
};

const getActivePresetIndex = (items: HTMLElement[], activeElement: Element | null) => {
  if (!(activeElement instanceof HTMLElement)) return -1;
  return items.indexOf(activeElement);
};

const getActiveGridDate = (container: HTMLElement) => {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement) || !container.contains(activeElement)) return null;

  const time = Number(activeElement.dataset.calendarDayTime);
  if (!Number.isFinite(time)) return null;

  return new Date(time);
};

const getInitialGridFocusDate = (currentMonth: Date, preferredDate?: Date) => {
  if (preferredDate && isSameMonth(preferredDate, currentMonth)) return startOfDay(preferredDate);

  const today = new Date();
  if (isSameMonth(today, currentMonth)) return startOfDay(today);

  return startOfMonth(currentMonth);
};

const getGridTargetDate = (
  event: KeyboardEvent,
  activeDate: Date | null,
  initialFocusDate: Date,
) => {
  if (!activeDate) {
    if (event.key === 'PageUp') return addMonths(initialFocusDate, -1);
    if (event.key === 'PageDown') return addMonths(initialFocusDate, 1);
    return initialFocusDate;
  }

  switch (event.key) {
    case 'ArrowLeft':
      return addDays(activeDate, -1);
    case 'ArrowRight':
      return addDays(activeDate, 1);
    case 'ArrowUp':
      return addDays(activeDate, -7);
    case 'ArrowDown':
      return addDays(activeDate, 7);
    case 'PageUp':
      return addMonths(activeDate, -1);
    case 'PageDown':
      return addMonths(activeDate, 1);
    default:
      return null;
  }
};

const focusGridDay = (container: HTMLElement, date: Date) => {
  const dayButton = container.querySelector<HTMLButtonElement>(
    `[data-calendar-day-time="${date.getTime()}"]`,
  );
  if (!dayButton) return false;

  focusKeyboardItem(container, dayButton);
  return true;
};

interface UseDatePickerKeyboardNavigationOptions {
  enabled?: boolean;
  presetListRef: RefObject<HTMLElement | null>;
  calendarGridRef: RefObject<HTMLElement | null>;
  currentMonth: Date;
  preferredDate?: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onCalendarMonthChange: (month: Date) => void;
}

export const useDatePickerKeyboardNavigation = ({
  enabled = true,
  presetListRef,
  calendarGridRef,
  currentMonth,
  preferredDate,
  onPreviousMonth,
  onNextMonth,
  onCalendarMonthChange,
}: UseDatePickerKeyboardNavigationOptions) => {
  const pendingGridFocusDateRef = useRef<Date | null>(null);
  const onPreviousMonthEvent = useEffectEvent(onPreviousMonth);
  const onNextMonthEvent = useEffectEvent(onNextMonth);
  const onCalendarMonthChangeEvent = useEffectEvent(onCalendarMonthChange);

  useEffect(() => {
    if (!enabled) return;

    const grid = calendarGridRef.current;
    const pendingFocusDate = pendingGridFocusDateRef.current;
    if (!grid || !pendingFocusDate || !isSameMonth(pendingFocusDate, currentMonth)) return;

    if (focusGridDay(grid, pendingFocusDate)) {
      pendingGridFocusDateRef.current = null;
    }
  }, [enabled, calendarGridRef, currentMonth]);

  useEffect(() => {
    if (!enabled) return;

    const handlePresetListNavigation = (event: KeyboardEvent, presetList: HTMLElement) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return false;

      const activeElement = document.activeElement;
      if (!canNavigatePresetList(presetList, activeElement)) return false;

      const items = getPresetItems(presetList);
      if (items.length === 0) return false;

      event.preventDefault();

      const activeIndex = getActivePresetIndex(items, activeElement);
      if (activeIndex === -1) {
        focusKeyboardItem(presetList, items[event.key === 'ArrowUp' ? items.length - 1 : 0]);
        return true;
      }

      const direction = event.key === 'ArrowUp' ? -1 : 1;
      const nextIndex = (activeIndex + direction + items.length) % items.length;
      focusKeyboardItem(presetList, items[nextIndex]);
      return true;
    };

    const handleMonthNavigation = (event: KeyboardEvent, grid: HTMLElement | null) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return false;

      if (grid && event.target instanceof Node && grid.contains(event.target)) return false;

      event.preventDefault();
      if (event.key === 'ArrowLeft') {
        onPreviousMonthEvent();
      } else {
        onNextMonthEvent();
      }
      return true;
    };

    const handleGridNavigation = (event: KeyboardEvent, grid: HTMLElement) => {
      if (!(event.target instanceof Node) || !grid.contains(event.target)) return false;

      const activeDate = getActiveGridDate(grid);
      const targetDate = getGridTargetDate(
        event,
        activeDate,
        getInitialGridFocusDate(currentMonth, preferredDate),
      );
      if (!targetDate) return false;

      event.preventDefault();

      pendingGridFocusDateRef.current = targetDate;
      if (isSameMonth(targetDate, currentMonth) && focusGridDay(grid, targetDate)) {
        pendingGridFocusDateRef.current = null;
        return true;
      }

      onCalendarMonthChangeEvent(targetDate);
      return true;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreKeyboardEvent(event)) return;

      const presetList = presetListRef.current;
      const grid = calendarGridRef.current;

      if (grid && handleGridNavigation(event, grid)) return;
      if (presetList && handlePresetListNavigation(event, presetList)) return;
      handleMonthNavigation(event, grid);
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.hasAttribute(KEYBOARD_FOCUS_ATTRIBUTE)
      ) {
        return;
      }
      clearAllKeyboardFocus(presetListRef.current, calendarGridRef.current);
    };

    const handlePointerDown = () => {
      clearAllKeyboardFocus(presetListRef.current, calendarGridRef.current);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('pointerdown', handlePointerDown, true);
      clearAllKeyboardFocus(presetListRef.current, calendarGridRef.current);
    };
  }, [enabled, presetListRef, calendarGridRef, currentMonth, preferredDate]);
};
