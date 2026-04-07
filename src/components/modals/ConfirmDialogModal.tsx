import X from 'lucide-react/icons/x';
import { type ReactNode, useEffect, useState } from 'react';
import { ModalBackdrop } from '$components/ModalBackdrop';
import { ModalButton } from '$components/ModalButton';

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

export const ConfirmDialogModal = ({
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
    <ModalBackdrop zIndex="z-70" onClose={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="relative bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-sm animate-scale-in"
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
            className="shrink-0 ml-3 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 p-1 rounded-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
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

        <div className="border-t border-surface-200 dark:border-surface-700 p-4 flex justify-end gap-2">
          <ModalButton variant="secondary" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </ModalButton>
          {alternateLabel && onAlternate && (
            <ModalButton
              variant={alternateDestructive ? 'destructive' : 'primary'}
              onClick={onAlternate}
              disabled={isLoading}
            >
              {alternateLabel}
            </ModalButton>
          )}
          <ModalButton
            variant={destructive ? 'destructive' : 'primary'}
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            loading={isLoading}
          >
            {isConfirmDisabled ? `${confirmLabel} (${remainingSeconds}s)` : confirmLabel}
          </ModalButton>
        </div>
      </div>
    </ModalBackdrop>
  );
};
