import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { LoadingSpinner } from '$components/LoadingSpinner';

type ButtonVariant = 'primary' | 'secondary' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ModalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-500 hover:bg-primary-600 text-primary-contrast outline-hidden focus-visible:ring-2 focus-visible:ring-primary-contrast focus-visible:ring-inset dark:focus-visible:ring-white',
  secondary:
    'text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset',
  destructive:
    'bg-semantic-error text-white hover:opacity-90 outline-hidden focus-visible:ring-2 focus-visible:ring-surface-950 focus-visible:ring-inset dark:focus-visible:ring-white dark:text-surface-950',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export const ModalButton = forwardRef<HTMLButtonElement, ModalButtonProps>(
  (
    { variant = 'primary', size = 'md', loading = false, disabled, className, children, ...props },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        className={`flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 dark:disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`}
        {...props}
      >
        {loading && <LoadingSpinner className="h-4 w-4" />}
        {children}
      </button>
    );
  },
);
