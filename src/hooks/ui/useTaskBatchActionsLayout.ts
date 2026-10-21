import { useLayoutEffect, useRef, useState } from 'react';

export const TIGHT_TOOLBAR_WIDTH = 460;

export const useTaskBatchActionsLayout = () => {
  const [toolbarWidth, setToolbarWidth] = useState<number | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const updateToolbarWidth = () => setToolbarWidth(toolbar.clientWidth);
    updateToolbarWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateToolbarWidth);
      return () => window.removeEventListener('resize', updateToolbarWidth);
    }

    const observer = new ResizeObserver(([entry]) => {
      setToolbarWidth(entry.contentRect.width);
    });
    observer.observe(toolbar);

    return () => observer.disconnect();
  }, []);

  return {
    toolbarRef,
    isTight: toolbarWidth !== null && toolbarWidth < TIGHT_TOOLBAR_WIDTH,
  };
};
