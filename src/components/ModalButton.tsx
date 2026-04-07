import Loader2 from 'lucide-react/icons/loader-2';
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ModalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 hover:bg-primary-700 text-primary-contrast outline-hidden focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-inset',
  secondary:
    'border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
  destructive:
    'bg-red-600 hover:bg-red-700 text-white outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-inset',
  ghost:
    'text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
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
        className={`font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
