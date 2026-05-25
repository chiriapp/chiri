import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDismissableLayerState } from '$context/dismissableLayerContext';

export const CLOSE_CONTEXT_MENUS_EVENT = 'closeAllContextMenus';

interface ContextMenuPoint {
  x: number;
  y: number;
}

const CONTEXT_MENU_VIEWPORT_PADDING = 8;
const CONTEXT_MENU_CURSOR_GAP = 4;

export const getContextMenuPosition = (x: number, y: number, width: number, height: number) => {
  const maxX = Math.max(
    CONTEXT_MENU_VIEWPORT_PADDING,
    window.innerWidth - width - CONTEXT_MENU_VIEWPORT_PADDING,
  );
  const maxY = Math.max(
    CONTEXT_MENU_VIEWPORT_PADDING,
    window.innerHeight - height - CONTEXT_MENU_VIEWPORT_PADDING,
  );
  const left =
    x + CONTEXT_MENU_CURSOR_GAP + width <= window.innerWidth - CONTEXT_MENU_VIEWPORT_PADDING
      ? x + CONTEXT_MENU_CURSOR_GAP
      : x - width - CONTEXT_MENU_CURSOR_GAP;
  const top =
    y + CONTEXT_MENU_CURSOR_GAP + height <= window.innerHeight - CONTEXT_MENU_VIEWPORT_PADDING
      ? y + CONTEXT_MENU_CURSOR_GAP
      : y - height - CONTEXT_MENU_CURSOR_GAP;

  return {
    left: Math.min(Math.max(left, CONTEXT_MENU_VIEWPORT_PADDING), maxX),
    top: Math.min(Math.max(top, CONTEXT_MENU_VIEWPORT_PADDING), maxY),
  };
};

export const useContextMenuPosition = (contextMenu: ContextMenuPoint) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(() =>
    getContextMenuPosition(contextMenu.x, contextMenu.y, 0, 0),
  );

  useLayoutEffect(() => {
    const rect = menuRef.current?.getBoundingClientRect();
    if (!rect) return;

    const nextPosition = getContextMenuPosition(
      contextMenu.x,
      contextMenu.y,
      rect.width,
      rect.height,
    );
    setPosition((currentPosition) =>
      currentPosition.left === nextPosition.left && currentPosition.top === nextPosition.top
        ? currentPosition
        : nextPosition,
    );
  });

  return { menuRef, position };
};

export const useContextMenuDismissal = (onClose: () => void, isOpen: boolean) => {
  const { isAnyModalOpen } = useDismissableLayerState();

  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-context-menu-content]')) {
        return;
      }
      if (isAnyModalOpen) {
        return;
      }
      onClose();
    };

    const handleCustomEvent = () => {
      onClose();
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleGlobalClick, true);
      document.addEventListener(CLOSE_CONTEXT_MENUS_EVENT, handleCustomEvent);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleGlobalClick, true);
      document.removeEventListener(CLOSE_CONTEXT_MENUS_EVENT, handleCustomEvent);
    };
  }, [isOpen, onClose, isAnyModalOpen]);
};

/**
 * Hook for managing context menu state and handlers
 * @returns Object with contextMenu state, handlers, and setter
 */
export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
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
