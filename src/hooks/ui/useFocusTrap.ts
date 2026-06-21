import { useEffect, useRef } from 'react';

type InitialFocusTarget = 'first-focusable' | 'container';

/**
 * hook to trap focus within a modal or dialog
 * prevents Tab navigation from reaching background elements
 * @param enabled - whether the focus trap is active (default: true)
 * @returns ref to attach to the container element
 */
export const useFocusTrap = <T extends HTMLElement = HTMLDivElement>(
  enabled = true,
  initialFocus: InitialFocusTarget = 'first-focusable',
) => {
  const containerRef = useRef<T>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    // store the element that was focused before the modal opened
    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    // query selector for all focusable elements
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    // get all focusable elements and focus the first one
    const getFocusableElements = (): HTMLElement[] => {
      const elements = Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
      // filter out elements that might be hidden via CSS
      return elements.filter((el) => {
        return (
          el.offsetParent !== null && // not display: none
          window.getComputedStyle(el).visibility !== 'hidden' // not visibility: hidden
        );
      });
    };

    // focus after a short delay to allow modal to render
    const applyInitialFocus = () => {
      if (initialFocus === 'container') {
        container.focus({ preventScroll: true });
        return;
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        // try to focus the first non-close button element if possible
        const firstNonCloseButton =
          focusableElements.find(
            (el) =>
              el.getAttribute('aria-label') !== 'Close' && !el.classList.contains('close-button'),
          ) || focusableElements[0];
        firstNonCloseButton.focus();
      }
    };

    // small delay to ensure modal is fully rendered
    const focusTimeout = setTimeout(applyInitialFocus, 50);

    // handle Tab key to trap focus
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      if (activeElement === container) {
        e.preventDefault();
        (e.shiftKey ? lastElement : firstElement).focus();
        return;
      }

      // if shift+tab from first element, wrap to last
      if (e.shiftKey && activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
        return;
      }

      // if tab from last element, wrap to first
      if (!e.shiftKey && activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
        return;
      }

      // check if focus is outside the modal (shouldn't happen, but be safe)
      if (!container.contains(activeElement)) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    // add event listener with capture to intercept before other handlers
    container.addEventListener('keydown', handleTabKey, true);

    // cleanup
    return () => {
      clearTimeout(focusTimeout);
      container.removeEventListener('keydown', handleTabKey, true);

      // return focus to the previously focused element
      if (
        previouslyFocusedElement.current &&
        document.body.contains(previouslyFocusedElement.current)
      ) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [enabled, initialFocus]);

  return containerRef;
};
