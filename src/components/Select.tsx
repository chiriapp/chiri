import ChevronDown from 'lucide-react/icons/chevron-down';
import { type MouseEvent, type ReactNode, type SelectHTMLAttributes, useRef } from 'react';

interface AppSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
}

// WebKitGTK (Linux) bug: clicking a <select> twice in quick succession closes
// the native popup and immediately re-opens it. debouncing mousedown (which is
// what actually triggers the popup) prevents the spurious re-open
const WEBKIT_DOUBLE_OPEN_THRESHOLD_MS = 400;

/**
 * styled select with custom chevron. avoids ugly native OS styling on Linux/Windows
 */
export const Select = ({ className = '', children, onMouseDown, ...props }: AppSelectProps) => {
  const isFullWidth = className.includes('w-full');
  const lastMouseDownAt = useRef(0);

  // native select popups on some platforms (notably Windows/Linux in dark mode)
  // can inherit focus background colors from the <select> itself, causing the
  // dropdown list to become accent-tinted and unreadable
  const sanitizedClassName = className
    .split(/\s+/)
    .filter(
      (token) => token && !token.startsWith('focus:bg-') && !token.startsWith('dark:focus:bg-'),
    )
    .join(' ');

  const handleMouseDown = (e: MouseEvent<HTMLSelectElement>) => {
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
        className={`appearance-none rounded-md px-3 py-0.5 pr-7 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 ${sanitizedClassName}`}
        onMouseDown={handleMouseDown}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-surface-500 dark:text-surface-400"
      />
    </div>
  );
};
