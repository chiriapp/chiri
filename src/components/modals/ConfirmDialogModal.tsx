import AlertTriangle from 'lucide-react/icons/triangle-alert';
import { type ReactNode, useEffect, useState } from 'react';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import type { ConfirmNotice } from '$context/confirmDialogContext';

type ConfirmButtonVariant = 'primary' | 'secondary' | 'destructive';

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
  const isDelayActive = remainingSeconds > 0;
  const isConfirmDisabled = isDelayActive || isLoading || disableConfirm;
  const confirmVariant: ConfirmButtonVariant = destructive
    ? 'destructive'
    : alternateLabel
      ? 'secondary'
      : 'primary';
  const alternateVariant: ConfirmButtonVariant = alternateDestructive
    ? 'destructive'
    : destructive
      ? 'secondary'
      : 'primary';

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
  }, [isOpen, onConfirm, isConfirmDisabled]);

  if (!isOpen) return null;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      description={subtitle}
      size="sm"
      zIndex="z-70"
      escapeLayerType="confirm-dialog"
      footer={
        <>
          <ModalButton variant="secondary" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </ModalButton>
          {alternateLabel && onAlternate && (
            <ModalButton variant={alternateVariant} onClick={onAlternate} disabled={isLoading}>
              {alternateLabel}
            </ModalButton>
          )}
          <ModalButton
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            loading={isLoading}
          >
            {isDelayActive ? `${confirmLabel} (${remainingSeconds}s)` : confirmLabel}
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4">
        {message && (
          <div
            id="confirm-dialog-description"
            className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed"
          >
            {message}
          </div>
        )}

        {notice && (
          <div className="flex gap-2 rounded-lg border border-semantic-info/30 bg-semantic-info/10 px-3 py-2 text-xs text-surface-700 dark:text-surface-300">
            <AlertTriangle className="mt-px size-3.5 shrink-0 text-semantic-info" />
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
          <div className="flex gap-2 rounded-lg border border-semantic-error/30 bg-semantic-error/10 px-3 py-2 text-xs text-surface-700 dark:text-surface-300">
            <AlertTriangle className="mt-px size-3.5 shrink-0 text-semantic-error" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
};
