import { useCallback, useEffect, useState } from 'react';
import { MAX_EDITOR_WIDTH, MIN_EDITOR_WIDTH } from '$constants';

export const useTaskEditorResize = (onWidthChange: (width: number) => void) => {
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
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

  const handleResizeStart = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  return { isResizing, handleResizeStart };
};
