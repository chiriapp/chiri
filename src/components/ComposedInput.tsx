import { forwardRef } from 'react';
import { useComposition } from '$hooks/ui/useComposition';

interface ComposedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string, cursorPos?: number | null) => void;
}

/**
 * input component with built-in dead key composition handling.
 * using this instead of regular <textarea> to fix issues with IME layouts which rely on dead keys
 */
export const ComposedInput = forwardRef<HTMLInputElement, ComposedInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const composition = useComposition<HTMLInputElement>(value, onChange);

    return (
      <input
        ref={ref}
        value={composition.value}
        onChange={composition.handleChange}
        {...composition.compositionProps}
        {...props}
      />
    );
  },
);
