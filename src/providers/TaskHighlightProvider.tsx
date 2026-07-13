import { type ReactNode, useCallback, useRef, useState } from 'react';
import { TaskHighlightContext } from '$context/taskHighlightContext';

const DEFAULT_HIGHLIGHT_DURATION_MS = 3000;

export const TaskHighlightProvider = ({ children }: { children: ReactNode }) => {
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearHighlight = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setHighlightedTaskId(null);
  }, []);

  const highlightTask = useCallback(
    (taskId: string | null, durationMs = DEFAULT_HIGHLIGHT_DURATION_MS) => {
      clearHighlight();

      if (taskId) {
        setHighlightedTaskId(taskId);
        timeoutRef.current = setTimeout(() => {
          setHighlightedTaskId((current) => (current === taskId ? null : current));
        }, durationMs);
      }
    },
    [clearHighlight],
  );

  return (
    <TaskHighlightContext.Provider value={{ highlightedTaskId, highlightTask, clearHighlight }}>
      {children}
    </TaskHighlightContext.Provider>
  );
};
