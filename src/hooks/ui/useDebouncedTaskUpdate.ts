import { useEffect, useRef, useState } from 'react';
import { useUpdateTask } from '$hooks/queries/useTasks';

/**
 * hook to debounce task field updates
 * provides local state that updates immediately, while database updates are debounced
 */
export const useDebouncedTaskUpdate = <T>(
  taskId: string,
  fieldName: string,
  initialValue: T,
  debounceMs: number = 200,
) => {
  const updateTaskMutation = useUpdateTask();
  const [pendingValue, setPendingValue] = useState<T>(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValueRef = useRef(pendingValue);
  const initialValueRef = useRef(initialValue);

  // Keep refs current
  pendingValueRef.current = pendingValue;
  initialValueRef.current = initialValue;

  // Sync pending value when task or initial value changes (e.g., switching tasks)
  const [prevTaskId, setPrevTaskId] = useState(taskId);
  const [prevInitialValue, setPrevInitialValue] = useState(initialValue);
  if (taskId !== prevTaskId || initialValue !== prevInitialValue) {
    setPrevTaskId(taskId);
    setPrevInitialValue(initialValue);
    setPendingValue(initialValue);
  }

  // update function that debounces the mutation
  const updateValue = (newValue: T) => {
    setPendingValue(newValue);

    // clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // set new timeout for debounced update
    timeoutRef.current = setTimeout(() => {
      updateTaskMutation.mutate({
        id: taskId,
        updates: { [fieldName]: newValue },
      });
    }, debounceMs);
  };

  // cleanup: flush pending changes on unmount
  // biome-ignore lint/correctness/useExhaustiveDependencies: cleanup only on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        // save any pending changes
        if (pendingValueRef.current !== initialValueRef.current) {
          updateTaskMutation.mutate({
            id: taskId,
            updates: { [fieldName]: pendingValueRef.current },
          });
        }
      }
    };
  }, []);

  return [pendingValue, updateValue] as const;
};
