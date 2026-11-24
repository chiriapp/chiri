import type { CSSProperties, DragEventHandler, ReactNode, Ref } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ModalBackdrop } from '$components/ModalBackdrop';
import { ModalHeader } from '$components/ModalHeader';
import { MODAL_SIZE_CLASSES } from '$constants';
import type { DismissableLayerType } from '$context/dismissableLayerContext';
import { useModalState } from '$context/modalStateContext';
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
  /** optional content rendered before the title, e.g. a back button */
  headerLeft?: ReactNode;
  /** optional content rendered before the close button, e.g. a header action */
  headerRight?: ReactNode;
  children: ReactNode;
  /** footer content - rendered in a flex container with gap-3. use footerLeft for split layouts */
  footer?: ReactNode;
  /** left side of footer for split layouts (e.g., Clear button). when provided, footer is right-aligned */
  footerLeft?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  preventClose?: boolean;
  zIndex?: 'z-50' | 'z-60' | 'z-70';
  contentPadding?: boolean;
  contentOverflow?: 'hidden' | 'auto';
  /** ref for the scrolling content element, e.g. to save and restore its scroll position */
  contentRef?: Ref<HTMLDivElement>;
  initialFocus?: 'first-focusable' | 'dialog';
  handleEscapeKey?: boolean;
  onEscape?: () => void;
  escapeLayerType?: DismissableLayerType;
  backdropProps?: ModalWrapperBackdropProps;
  backdropClassName?: string;
  animateBackdrop?: boolean;
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
  headerRight,
  children,
  footer,
  footerLeft,
  size = 'md',
  preventClose = false,
  zIndex = 'z-60',
  contentPadding = true,
  contentOverflow = contentPadding ? 'auto' : 'hidden',
  contentRef,
  initialFocus = 'first-focusable',
  handleEscapeKey = true,
  onEscape,
  escapeLayerType = 'modal',
  backdropProps,
  backdropClassName,
  animateBackdrop = true,
  dialogAnimationDelayMs = 0,
  className,
}: ModalWrapperProps) => {
  const { isAnyModalOpen } = useModalState();
  const previousIsOpenRef = useRef(false);
  const animateBackdropRef = useRef(false);
  const pendingNestedBackdropRef = useRef(false);
  const [isNestedModalOpen, setIsNestedModalOpen] = useState(false);

  // keep the backdrop opaque when replacing one modal with another
  if (isOpen && !previousIsOpenRef.current) {
    previousIsOpenRef.current = true;
    animateBackdropRef.current = animateBackdrop && !isAnyModalOpen;
    pendingNestedBackdropRef.current = animateBackdrop && isAnyModalOpen;
  } else if (!isOpen) {
    previousIsOpenRef.current = false;
  }

  // backdrop layer here so we can have nice gradual background dim for nested modals too
  useLayoutEffect(() => {
    if (!isOpen) {
      pendingNestedBackdropRef.current = false;
      setIsNestedModalOpen(false);
      return;
    }

    if (!pendingNestedBackdropRef.current) return;

    pendingNestedBackdropRef.current = false;
    setIsNestedModalOpen(document.querySelectorAll('[data-modal-backdrop-layer]').length > 1);
  }, [isOpen]);

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
  // until the mouse moves, even when the modal now sits under the pointer
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
      animate={animateBackdropRef.current || isNestedModalOpen}
      animateFromDimmed={animateBackdrop && !animateBackdropRef.current && !isNestedModalOpen}
      {...backdropProps}
    >
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        tabIndex={initialFocus === 'dialog' ? -1 : undefined}
        className={`relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl bg-white shadow-xl outline-hidden motion-safe:animate-scale-in dark:bg-surface-800 ${className || MODAL_SIZE_CLASSES[size]}`}
        style={dialogAnimationStyle}
      >
        {title && (
          <ModalHeader
            title={title}
            description={description}
            headerLeft={headerLeft}
            headerRight={headerRight}
            preventClose={preventClose}
            onClose={handleClose}
          />
        )}

        <div
          ref={contentRef}
          className={`${contentPadding ? 'space-y-4 p-4' : ''} ${contentOverflow === 'auto' ? 'overflow-y-auto overflow-x-hidden overscroll-contain' : 'overflow-hidden'} min-h-0 flex-auto ${!title ? 'rounded-t-xl' : ''}`}
        >
          {children}
        </div>

        {(footer || footerLeft) && (
          <div
            className={`flex items-center border-surface-300 border-t p-4 dark:border-surface-700 ${footerLeft ? 'justify-between' : 'justify-end'} shrink-0 gap-3 rounded-b-xl bg-white dark:bg-surface-800`}
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
