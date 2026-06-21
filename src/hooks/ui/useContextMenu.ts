import { type MouseEvent, useCallback, useEffect, useState } from 'react';

export const CLOSE_CONTEXT_MENUS_EVENT = 'closeAllContextMenus';

export const useContextMenuDismissal = (onClose: () => void, isOpen: boolean) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleCustomEvent = () => {
      onClose();
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener(CLOSE_CONTEXT_MENUS_EVENT, handleCustomEvent);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener(CLOSE_CONTEXT_MENUS_EVENT, handleCustomEvent);
    };
  }, [isOpen, onClose]);
};

/**
 * hook for managing context menu state and handlers
 * @returns Object with contextMenu state, handlers, and setter
 */
export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.dispatchEvent(new CustomEvent(CLOSE_CONTEXT_MENUS_EVENT));
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useContextMenuDismissal(handleCloseContextMenu, contextMenu !== null);

  return { contextMenu, handleContextMenu, handleCloseContextMenu, setContextMenu };
};
