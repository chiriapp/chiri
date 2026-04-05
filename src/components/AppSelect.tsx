import ChevronDown from 'lucide-react/icons/chevron-down';
import { useRef } from 'react';

interface AppSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

// WebKitGTK (Linux) bug: clicking a <select> twice in quick succession closes
// the native popup and immediately re-opens it. Debouncing mousedown (which is
// what actually triggers the popup) prevents the spurious re-open.
const WEBKIT_DOUBLE_OPEN_THRESHOLD_MS = 400;

/**
 * Styled select with custom chevron — avoids ugly native OS styling on Linux/Windows.
 * Pass `w-full` in `className` to make it block/full-width; otherwise renders inline.
 */
export const AppSelect = ({ className = '', children, onMouseDown, ...props }: AppSelectProps) => {
  const isFullWidth = className.includes('w-full');
  const lastMouseDownAt = useRef(0);

  const handleMouseDown = (e: React.MouseEvent<HTMLSelectElement>) => {
    const now = Date.now();
    if (now - lastMouseDownAt.current < WEBKIT_DOUBLE_OPEN_THRESHOLD_MS) {
      e.preventDefault();
      return;
    }
    lastMouseDownAt.current = now;
    onMouseDown?.(e);
  };

  return (
    <div className={`relative ${isFullWidth ? 'block w-full' : 'inline-flex items-center'}`}>
      <select
        className={`appearance-none px-3 py-0.5 pr-7 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 rounded-sm ${className}`}
        onMouseDown={handleMouseDown}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-surface-500 dark:text-surface-400"
      />
    </div>
  );
};
