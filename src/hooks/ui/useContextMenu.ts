import { useCallback, useState } from 'react';
import { useGlobalContextMenuClose } from '$hooks/ui/useGlobalContextMenu';
import { clampToViewport } from '$utils/misc';

/**
 * Hook for managing context menu state and handlers
 * @returns Object with contextMenu state, handlers, and setter
 */
export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.dispatchEvent(new CustomEvent('closeAllContextMenus'));
    const { x, y } = clampToViewport(e.clientX, e.clientY);
    setContextMenu({ x, y });
  };

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useGlobalContextMenuClose(handleCloseContextMenu, contextMenu !== null);

  return { contextMenu, handleContextMenu, handleCloseContextMenu, setContextMenu };
};
