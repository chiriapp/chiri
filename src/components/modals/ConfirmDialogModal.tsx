import AlertTriangle from 'lucide-react/icons/triangle-alert';
import Loader2 from 'lucide-react/icons/loader-2';
import X from 'lucide-react/icons/x';
import { type ReactNode, useEffect, useState } from 'react';
import { ModalBackdrop } from '$components/ModalBackdrop';
import type { ConfirmNotice } from '$context/confirmDialogContext';

const getButtonClasses = (isDestructive: boolean, isPrimary: boolean) => {
  if (isDestructive) {
    return 'bg-red-600 hover:bg-red-700 outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 text-white';
  }

  if (isPrimary) {
    return 'bg-primary-600 hover:bg-primary-700 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-700 text-primary-contrast';
  }

  return 'border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500';
};

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
  error?: string;
  notice?: ConfirmNotice;
  disableConfirm?: boolean;
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
  error,
  notice,
  disableConfirm = false,
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
    <ModalBackdrop zIndex="z-[70]" onClose={onCancel}>
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
            className="flex-shrink-0 ml-3 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 p-1 rounded transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {message && (
          <div className="p-4">
            <p
              id="confirm-dialog-description"
              className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed"
            >
              {message}
            </p>
          </div>
        )}

        {notice && (
          <div className={`mx-4 mb-4 flex gap-2 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 px-3 py-2 text-xs text-primary-700 dark:text-primary-300${message ? '' : ' mt-4'}`}>
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
            <span>
              {notice.message}{' '}
              {notice.link && (
                <a
                  href={notice.link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline underline-offset-2 hover:opacity-80"
                >
                  {notice.link.label}
                </a>
              )}
              {notice.suffix}
            </span>
          </div>
        )}

        {error && (
          <div className="mx-4 mb-4 flex gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="px-4 pb-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
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
            disabled={isConfirmDisabled || isLoading || disableConfirm}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${getButtonClasses(destructive, !alternateLabel)} disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isConfirmDisabled ? `${confirmLabel} (${remainingSeconds}s)` : confirmLabel}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
};
