import { useCallback, useRef, useState } from 'react';

/**
 * hook to handle IME composition events for proper dead key input handling
 *
 * @param externalValue - the current value from props/external state
 * @param onUpdate - callback when the value should be committed to external state
 */
export const useComposition = <T extends HTMLInputElement | HTMLTextAreaElement>(
  externalValue: string,
  onUpdate: (value: string, cursorPos: number | null) => void,
) => {
  const isComposingRef = useRef(false);
  const [localValue, setLocalValue] = useState<string | null>(null);

  const value = localValue !== null ? localValue : externalValue;

  const handleChange = useCallback(
    (e: React.ChangeEvent<T>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart;

      if (isComposingRef.current) {
        // during composition, only update local state
        setLocalValue(newValue);
      } else {
        // not composing, update external state immediately
        setLocalValue(null);
        onUpdate(newValue, cursorPos);
      }
    },
    [onUpdate],
  );

  const onCompositionStart = useCallback(() => {
    isComposingRef.current = true;
    // initialize local value with current external value
    setLocalValue(externalValue);
  }, [externalValue]);

  const onCompositionEnd = useCallback(
    (e: React.CompositionEvent<T>) => {
      isComposingRef.current = false;
      const finalValue = e.currentTarget.value;
      const cursorPos = e.currentTarget.selectionStart;

      // clear local state and commit to external state
      setLocalValue(null);
      onUpdate(finalValue, cursorPos);
    },
    [onUpdate],
  );

  return {
    value,
    handleChange,
    compositionProps: {
      onCompositionStart,
      onCompositionEnd,
    },
  };
};
