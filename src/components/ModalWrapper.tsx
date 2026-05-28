import X from 'lucide-react/icons/x';
import type { DragEventHandler, ReactNode } from 'react';
import { ModalBackdrop } from '$components/ModalBackdrop';
import { MODAL_SIZE_CLASSES } from '$constants';
import type { DismissableLayerType } from '$context/dismissableLayerContext';
import { useDismissableLayer } from '$hooks/ui/useDismissableLayer';
import { useFocusTrap } from '$hooks/ui/useFocusTrap';

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
  handleEscapeKey?: boolean;
  onEscape?: () => void;
  escapeLayerType?: DismissableLayerType;
  backdropProps?: ModalWrapperBackdropProps;
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
  handleEscapeKey = true,
  onEscape,
  escapeLayerType = 'modal',
  backdropProps,
  className,
}: ModalWrapperProps) => {
  const focusTrapRef = useFocusTrap(isOpen);
  const canHandleEscape = handleEscapeKey && (!preventClose || onEscape !== undefined);

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

          (onEscape ?? onClose)();
        }
      : undefined,
  });

  if (!isOpen) return null;

  return (
    <ModalBackdrop className="p-4 cursor-default" zIndex={zIndex} {...backdropProps}>
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        className={`relative bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-in ${className || MODAL_SIZE_CLASSES[size]}`}
      >
        {title && (
          <div className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 p-4 shrink-0 flex items-center justify-between rounded-t-xl">
            <div className="flex min-w-0 items-center gap-3">
              {headerLeft}
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {title}
                </h2>
                {description && (
                  <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
                    {description}
                  </p>
                )}
              </div>
            </div>
            {!preventClose && (
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div
          className={`${contentPadding ? 'p-4 space-y-4' : ''} ${contentOverflow === 'auto' ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden'} flex-1 min-h-0 ${!title ? 'rounded-t-xl' : ''}`}
        >
          {children}
        </div>

        {(footer || footerLeft) && (
          <div
            className={`border-t border-surface-200 dark:border-surface-700 p-4 flex items-center ${footerLeft ? 'justify-between' : 'justify-end'} gap-3 shrink-0 bg-white dark:bg-surface-800 rounded-b-xl`}
          >
            {footerLeft && <div className="flex items-center gap-3">{footerLeft}</div>}
            {footer && <div className="flex items-center gap-3">{footer}</div>}
          </div>
        )}
      </div>
    </ModalBackdrop>
  );
};
