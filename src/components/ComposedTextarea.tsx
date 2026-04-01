import { forwardRef } from 'react';
import { useComposition } from '$hooks/ui/useComposition';

interface ComposedTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string, cursorPos?: number | null) => void;
}

/**
 * textarea component with built-in dead key composition handling
 * using this instead of regular <textarea> to fix issues with IME layouts which rely on dead keys
 */
export const ComposedTextarea = forwardRef<HTMLTextAreaElement, ComposedTextareaProps>(
  ({ value, onChange, ...props }, ref) => {
    const composition = useComposition<HTMLTextAreaElement>(value, onChange);

    return (
      <textarea
        ref={ref}
        value={composition.value}
        onChange={composition.handleChange}
        {...composition.compositionProps}
        {...props}
      />
    );
  },
);
