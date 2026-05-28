import { useCallback, useEffect, useRef } from 'react';

/**
 * Focus an element once after it first mounts.
 * Useful for modal inputs without letting later rerenders steal focus back.
 */
export const useInitialFocusRef = <T extends HTMLElement>(delayMs = 100) => {
  const elementRef = useRef<T | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearPendingFocus = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return clearPendingFocus;
  }, [clearPendingFocus]);

  return useCallback(
    (element: T | null) => {
      clearPendingFocus();
      elementRef.current = element;

      if (!element) return;

      timeoutRef.current = window.setTimeout(() => {
        if (elementRef.current === element) {
          element.focus();
        }
        timeoutRef.current = null;
      }, delayMs);
    },
    [clearPendingFocus, delayMs],
  );
};
