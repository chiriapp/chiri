import { type MouseEvent, useCallback, useEffect, useState } from 'react';
import { MAX_EDITOR_WIDTH, MIN_EDITOR_WIDTH } from '$constants';

export const useTaskEditorResize = (onWidthChange: (width: number) => void) => {
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    // we use globalThis.MouseEvent to avoid conflicts with React's MouseEvent type
    const handleMouseMove = (event: globalThis.MouseEvent) => {
      if (!isResizing) return;

      const newWidth = Math.min(
        MAX_EDITOR_WIDTH,
        Math.max(MIN_EDITOR_WIDTH, window.innerWidth - event.clientX),
      );
      onWidthChange(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onWidthChange]);

  const handleResizeStart = useCallback((event: MouseEvent) => {
    event.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  return { isResizing, handleResizeStart };
};
