import { createContext, useContext } from 'react';

export interface TaskHighlightContextValue {
  highlightedTaskId: string | null;
  highlightTask: (taskId: string | null, durationMs?: number) => void;
  clearHighlight: () => void;
}

export const TaskHighlightContext = createContext<TaskHighlightContextValue | null>(null);

export const useTaskHighlight = (): TaskHighlightContextValue => {
  const context = useContext(TaskHighlightContext);
  if (!context) {
    throw new Error('useTaskHighlight must be used within a TaskHighlightProvider');
  }
  return context;
};
