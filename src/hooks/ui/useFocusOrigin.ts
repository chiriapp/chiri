import { useEffect } from 'react';

/** only keys that move focus count as navigation; Esc and shortcuts are dismissals and invocations */
const NAVIGATION_KEYS = new Set([
  'Tab',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

const KEYBOARD = 'keyboard';
const POINTER = 'pointer';

const setOrigin = (origin: typeof POINTER | typeof KEYBOARD) => {
  document.documentElement.dataset.focusOrigin = origin;
};

/**
 * tracks how the focused element got focus so focus rings can follow keyboard navigation
 * instead of the webview's `:focus-visible` heuristic, which reports programmatic focus as
 * visible whenever the last event it saw was a key press (Esc dismissing search, Cmd+, reopening
 * settings) or when the pointer never reached the webview (native menu opening a dialog)
 *
 * a focus change only counts as navigation when it lands while a navigation key is being handled:
 * the UA moves focus during that key's default action, so arming for the remainder of the task
 * covers both UA moves and the `.focus()` calls app key handlers make themselves
 */
export const useFocusOrigin = () => {
  useEffect(() => {
    setOrigin(POINTER);

    let navigationPending = false;
    let disarmTimer: number | null = null;

    const disarm = () => {
      navigationPending = false;
      if (disarmTimer !== null) {
        window.clearTimeout(disarmTimer);
        disarmTimer = null;
      }
    };

    const handlePointerDown = () => {
      disarm();
      setOrigin(POINTER);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!NAVIGATION_KEYS.has(event.key)) return;

      navigationPending = true;
      if (disarmTimer !== null) window.clearTimeout(disarmTimer);
      disarmTimer = window.setTimeout(disarm, 0);
    };

    const handleFocusIn = () => {
      setOrigin(navigationPending ? KEYBOARD : POINTER);
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('focusin', handleFocusIn, true);

    return () => {
      disarm();
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('focusin', handleFocusIn, true);
      delete document.documentElement.dataset.focusOrigin;
    };
  }, []);
};
