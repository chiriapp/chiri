import { useContext, useEffect, useRef } from 'react';
import { ConfirmDialogContext } from '$context/confirmDialogContext';
import { useEscapeKey } from '$hooks/ui/useEscapeKey';
import { hasOpenModalElements } from '$utils/misc';

// track all active modal escape handlers in order of registration
// this allows proper nesting - only the topmost modal should handle Esc
const activeHandlers: Set<symbol> = new Set();

/**
 * Check if this handler should be blocked from handling escape
 */
const shouldBlockEscape = (
  confirmDialogOpen: boolean,
  isPanel: boolean,
  handlerId: symbol,
): boolean => {
  // Block if confirm dialog is open
  if (confirmDialogOpen) return true;

  // Block if icon/emoji picker is open
  if (document.querySelector('[data-icon-emoji-picker-dropdown]')) return true;

  if (isPanel) {
    // Panels yield to context menus
    if (document.querySelector('[data-context-menu-content]')) return true;
    // Panels yield to modals
    if (hasOpenModalElements()) return true;
  } else {
    // For modals, only the topmost handler should respond
    const handlersArray = Array.from(activeHandlers);
    const myIndex = handlersArray.indexOf(handlerId);
    if (myIndex !== handlersArray.length - 1) return true;
  }

  return false;
};

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
  const handlerIdRef = useRef<symbol>(Symbol('modal-escape-handler'));
  const isPanel = options?.isPanel ?? false;
  const enabled = options?.enabled ?? true;
  const confirmDialogOpen = confirmDialogContext?.isOpen ?? false;

  // Keep modal stack registration in sync for topmost-only modal behavior.
  useEffect(() => {
    if (!enabled || isPanel) return;

    const handlerId = handlerIdRef.current;
    activeHandlers.add(handlerId);

    return () => {
      activeHandlers.delete(handlerId);
    };
  }, [enabled, isPanel]);

  useEscapeKey(
    (e) => {
      const handlerId = handlerIdRef.current;

      if (shouldBlockEscape(confirmDialogOpen, isPanel, handlerId)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation(); // Prevent other capture-phase handlers from running

      // blur active element to prevent focus ring on underlying elements
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      onClose();
    },
    { enabled, capture: true },
  );
};
