import X from 'lucide-react/icons/x';
import type { CSSProperties, DragEventHandler, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ModalBackdrop } from '$components/ModalBackdrop';
import { MODAL_SIZE_CLASSES } from '$constants';
import type { DismissableLayerType } from '$context/dismissableLayerContext';
import { useDismissableLayer } from '$hooks/ui/useDismissableLayer';
import { useFocusTrap } from '$hooks/ui/useFocusTrap';
import {
  resetStaleCursorOnLayerClose,
  useResetStaleCursorOnLayerOpen,
} from '$hooks/ui/useStaleCursorReset';

interface ModalWrapperBackdropProps {
  onDrop?: DragEventHandler<HTMLDivElement>;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onDragLeave?: DragEventHandler<HTMLDivElement>;
}

interface ModalWrapperProps {
  isOpen?: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  /** Optional content rendered before the title, e.g. a back button. */
  headerLeft?: ReactNode;
  children: ReactNode;
  /** Footer content - rendered in a flex container with gap-3. Use footerLeft for split layouts. */
  footer?: ReactNode;
  /** Left side of footer for split layouts (e.g., Clear button). When provided, footer is right-aligned. */
  footerLeft?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  preventClose?: boolean;
  zIndex?: 'z-50' | 'z-60' | 'z-70';
  contentPadding?: boolean;
  contentOverflow?: 'hidden' | 'auto';
  initialFocus?: 'first-focusable' | 'dialog';
  handleEscapeKey?: boolean;
  onEscape?: () => void;
  escapeLayerType?: DismissableLayerType;
  backdropProps?: ModalWrapperBackdropProps;
  backdropClassName?: string;
  dialogAnimationDelayMs?: number;
  className?: string;
}

const MODAL_LAYER_PRIORITIES: Record<NonNullable<ModalWrapperProps['zIndex']>, number> = {
  'z-50': 50,
  'z-60': 60,
  'z-70': 70,
};

export const ModalWrapper = ({
  isOpen = true,
  onClose,
  title,
  description,
  headerLeft,
  children,
  footer,
  footerLeft,
  size = 'md',
  preventClose = false,
  zIndex = 'z-60',
  contentPadding = true,
  contentOverflow = contentPadding ? 'auto' : 'hidden',
  initialFocus = 'first-focusable',
  handleEscapeKey = true,
  onEscape,
  escapeLayerType = 'modal',
  backdropProps,
  backdropClassName,
  dialogAnimationDelayMs = 0,
  className,
}: ModalWrapperProps) => {
  const focusTrapRef = useFocusTrap(
    isOpen,
    initialFocus === 'dialog' ? 'container' : 'first-focusable',
  );
  const canHandleEscape = handleEscapeKey && (!preventClose || onEscape !== undefined);
  const handleClose = () => {
    resetStaleCursorOnLayerClose();
    onClose();
  };

  // WebKit can keep showing the cursor from the element that opened the modal
  // until the mouse moves, even when the modal now sits under the pointer.
  useResetStaleCursorOnLayerOpen(isOpen);

  useDismissableLayer({
    enabled: isOpen,
    type: escapeLayerType,
    priority: escapeLayerType === 'modal' ? MODAL_LAYER_PRIORITIES[zIndex] : undefined,
    escapeBehavior: canHandleEscape ? 'dismiss' : 'block',
    onEscape: canHandleEscape
      ? () => {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }

          resetStaleCursorOnLayerClose();
          (onEscape ?? onClose)();
        }
      : undefined,
  });

  if (!isOpen) return null;

  const dialogAnimationStyle =
    dialogAnimationDelayMs > 0
      ? ({
          animationDelay: `${dialogAnimationDelayMs}ms`,
          animationFillMode: 'backwards',
        } satisfies CSSProperties)
      : undefined;

  return createPortal(
    <ModalBackdrop
      className="cursor-default p-4"
      backdropClassName={backdropClassName}
      zIndex={zIndex}
      {...backdropProps}
    >
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        tabIndex={initialFocus === 'dialog' ? -1 : undefined}
        className={`relative flex max-h-[90vh] w-full animate-scale-in flex-col overflow-hidden rounded-xl bg-white shadow-xl outline-hidden dark:bg-surface-800 ${className || MODAL_SIZE_CLASSES[size]}`}
        style={dialogAnimationStyle}
      >
        {title && (
          <div className="flex shrink-0 items-center justify-between rounded-t-xl border-surface-200 border-b bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
            <div className="flex min-w-0 items-center gap-3">
              {headerLeft}
              <div className="min-w-0">
                <h2 className="font-semibold text-lg text-surface-900 dark:text-surface-100">
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">
                    {description}
                  </p>
                )}
              </div>
            </div>
            {!preventClose && (
              <button
                type="button"
                onClick={handleClose}
                className="shrink-0 rounded-lg p-2 text-surface-500 outline-hidden transition-colors hover:bg-surface-100 hover:text-surface-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:hover:bg-surface-700 dark:hover:text-surface-300"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        <div
          className={`${contentPadding ? 'space-y-4 p-4' : ''} ${contentOverflow === 'auto' ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden'} min-h-0 flex-1 ${!title ? 'rounded-t-xl' : ''}`}
        >
          {children}
        </div>

        {(footer || footerLeft) && (
          <div
            className={`flex items-center border-surface-200 border-t p-4 dark:border-surface-700 ${footerLeft ? 'justify-between' : 'justify-end'} shrink-0 gap-3 rounded-b-xl bg-white dark:bg-surface-800`}
          >
            {footerLeft && <div className="flex items-center gap-3">{footerLeft}</div>}
            {footer && <div className="flex items-center gap-3">{footer}</div>}
          </div>
        )}
      </div>
    </ModalBackdrop>,
    document.body,
  );
};
