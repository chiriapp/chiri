/**
 * Global context menu management
 * Provides a way to dismiss all context menus when clicking anywhere in the app
 */
import { useCallback, useEffect, useState } from 'react';
import { hasOpenModalElements } from '$utils/misc';

// global registry of context menu close handlers
const closeHandlers = new Set<() => void>();

export const registerContextMenuClose = (handler: () => void): (() => void) => {
  closeHandlers.add(handler);
  return () => closeHandlers.delete(handler);
};

export const closeAllContextMenus = () => {
  closeHandlers.forEach((handler) => {
    handler();
  });
};

// custom event for closing context menus
const CLOSE_CONTEXT_MENUS_EVENT = 'closeAllContextMenus';

export const useGlobalContextMenuClose = (onClose: () => void, isOpen: boolean) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalClick = (e: MouseEvent) => {
      // don't close if clicking within a context menu
      const target = e.target as HTMLElement;
      if (target.closest('[data-context-menu-content]')) {
        return;
      }
      // don't close if a modal is open (modals are at z-60+)
      if (hasOpenModalElements()) {
        return;
      }
      onClose();
    };

    const handleCustomEvent = () => {
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Don't handle escape if a modal is open - let the modal handle it
        if (hasOpenModalElements()) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };

    // delay adding the listener to avoid immediate close from the same click
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleGlobalClick, true);
      document.addEventListener('keydown', handleKeyDown, true);
      document.addEventListener(CLOSE_CONTEXT_MENUS_EVENT, handleCustomEvent);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleGlobalClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener(CLOSE_CONTEXT_MENUS_EVENT, handleCustomEvent);
    };
  }, [isOpen, onClose]);
};

/**
 * Hook for managing a context menu state with global dismissal
 */
export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleOpen = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // close any other open context menus first
    document.dispatchEvent(new CustomEvent(CLOSE_CONTEXT_MENUS_EVENT));
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  // register this context menu for global close
  useGlobalContextMenuClose(handleClose, contextMenu !== null);

  return {
    contextMenu,
    handleOpen,
    handleClose,
    isOpen: contextMenu !== null,
  };
};
