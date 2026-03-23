import { useContext, useEffect, useRef } from 'react';
import { ConfirmDialogContext } from '$context/confirmDialogContext';
import { hasOpenModalElements } from '$utils/misc';

// track all active modal escape handlers in order of registration
// this allows proper nesting - only the topmost modal should handle Esc
const activeHandlers: Set<symbol> = new Set();

/**
 * hook to close a modal when the Escape key is pressed
 * won't trigger if a confirm dialog is open (to allow proper nesting)
 * only the most recently registered handler will respond to Escape
 * @param onClose - callback to execute when Escape is pressed
 * @param options - configuration options
 * @param options.isPanel - if true, this is a panel (like TaskEditor) that should yield to modals
 * @param options.enabled - if false, the handler will not be registered (useful for conditionally mounted modals)
 */
export const useModalEscapeKey = (
  onClose: () => void,
  options?: { isPanel?: boolean; enabled?: boolean },
) => {
  const confirmDialogContext = useContext(ConfirmDialogContext);
  const handlerIdRef = useRef<symbol | null>(null);
  const isPanelRef = useRef(options?.isPanel ?? false);
  const onCloseRef = useRef(onClose);
  const confirmDialogOpenRef = useRef(confirmDialogContext?.isOpen ?? false);
  const enabled = options?.enabled ?? true;

  // Keep onClose ref up to date without re-registering the handler
  // Keep refs current without re-registering the listener
  onCloseRef.current = onClose;
  confirmDialogOpenRef.current = confirmDialogContext?.isOpen ?? false;

  useEffect(() => {
    // Don't register handler if disabled
    if (!enabled) {
      return;
    }

    // create a unique identifier for this handler
    const handlerId = Symbol('modal-escape-handler');
    handlerIdRef.current = handlerId;

    // Only add to activeHandlers if not a panel (panels don't participate in the topmost check)
    if (!isPanelRef.current) {
      activeHandlers.add(handlerId);
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // don't handle if a confirm dialog is open - let it handle the escape
        if (confirmDialogOpenRef.current) {
          return;
        }

        // don't handle if an icon/emoji picker dropdown is open - let it handle the escape
        if (document.querySelector('[data-icon-emoji-picker-dropdown]')) {
          return;
        }

        // if this is a panel, only respond if no modals or context menus are open
        if (isPanelRef.current) {
          // Don't handle if a context menu is open - let it handle the escape first
          if (document.querySelector('[data-context-menu-content]')) {
            return;
          }

          // Check for actual modal DOM elements instead of relying on activeHandlers
          if (hasOpenModalElements()) {
            return;
          }
        } else {
          // This is a modal, check if it's the topmost one
          const handlersArray = Array.from(activeHandlers);
          const myIndex = handlersArray.indexOf(handlerId);

          // only the last registered (topmost) handler should respond
          if (myIndex !== handlersArray.length - 1) {
            return;
          }
        }

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Prevent other capture-phase handlers from running

        // blur active element to prevent focus ring on underlying elements
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleEsc, { capture: true });

    return () => {
      if (!isPanelRef.current) {
        activeHandlers.delete(handlerId);
      }
      window.removeEventListener('keydown', handleEsc, { capture: true } as EventListenerOptions);
    };
  }, [enabled]); // Re-run when enabled changes
};
