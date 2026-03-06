import Loader2 from 'lucide-react/icons/loader-2';
import X from 'lucide-react/icons/x';
import { type ReactNode, useEffect, useState } from 'react';
import { getButtonClasses } from '$utils/styles';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  alternateLabel?: string;
  alternateDestructive?: boolean;
  delayConfirmSeconds?: number;
  isLoading?: boolean;
  onConfirm: () => void;
  onAlternate?: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  isOpen,
  title,
  subtitle,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  alternateLabel,
  alternateDestructive = false,
  delayConfirmSeconds,
  isLoading = false,
  onConfirm,
  onAlternate,
  onCancel,
}: ConfirmDialogProps) => {
  const [remainingSeconds, setRemainingSeconds] = useState(delayConfirmSeconds || 0);
  const isConfirmDisabled = remainingSeconds > 0;

  // Countdown timer
  useEffect(() => {
    if (!isOpen || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, remainingSeconds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
      if (e.key === 'Enter' && !isConfirmDisabled) {
        e.preventDefault();
        e.stopPropagation();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener('keydown', handleKeyDown, {
        capture: true,
      } as EventListenerOptions);
  }, [isOpen, onCancel, onConfirm, isConfirmDisabled]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
      <div
        role="document"
        className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-sm animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-4 border-b border-surface-200 dark:border-surface-700 rounded-t-xl">
          <div className="flex-1 min-w-0">
            <h2
              id="confirm-dialog-title"
              className="text-lg font-semibold text-surface-900 dark:text-surface-100"
            >
              {title}
            </h2>
            {subtitle && (
              <p
                id="confirm-dialog-subtitle"
                className="text-sm text-surface-700 dark:text-surface-300 mt-1 truncate"
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex-shrink-0 ml-3 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 p-1 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <p
            id="confirm-dialog-description"
            className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed"
          >
            {message}
          </p>
        </div>

        <div className="px-4 pb-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          {alternateLabel && onAlternate && (
            <button
              type="button"
              onClick={onAlternate}
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${getButtonClasses(alternateDestructive, !alternateDestructive && !destructive)} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {alternateLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirmDisabled || isLoading}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${getButtonClasses(destructive, !alternateLabel)} disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isConfirmDisabled ? `${confirmLabel} (${remainingSeconds}s)` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
