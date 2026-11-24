import {
  type CSSProperties,
  cloneElement,
  Fragment,
  isValidElement,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useModalState } from '$context/modalStateContext';
import { useDismissableLayer } from '$hooks/ui/useDismissableLayer';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  triggerClassName?: string;
  allowInModal?: boolean;
  disabled?: boolean;
}

interface TooltipTriggerChildProps {
  'aria-describedby'?: string;
}

const isEscapeKey = (event: KeyboardEvent | ReactKeyboardEvent) =>
  event.key === 'Escape' || event.key === 'Esc';

export const Tooltip = ({
  content,
  children,
  delay = 0,
  position = 'top',
  className = '',
  triggerClassName = '',
  allowInModal = false,
  disabled = false,
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0, arrowX: 0, arrowY: 0 });
  const tooltipId = useId();
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isPointerInsideRef = useRef(false);
  const isFocusInsideRef = useRef(false);
  const isInteractionSuppressedRef = useRef(false);
  const { isAnyModalOpen, isContextMenuOpen } = useModalState();
  const isOverlayOpen = isAnyModalOpen || isContextMenuOpen;
  const isOverlayOpenRef = useRef(isOverlayOpen);
  isOverlayOpenRef.current = isOverlayOpen;
  const hasContent = Boolean(content);
  const isEnabled = hasContent && !disabled;
  const describedBy = isEnabled ? tooltipId : undefined;

  const clearShowTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const clearAnimationFrame = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const hideTooltip = useCallback(() => {
    clearShowTimeout();
    clearAnimationFrame();
    setIsVisible(false);
  }, [clearAnimationFrame, clearShowTimeout]);

  const dismissTooltip = useCallback(() => {
    setIsDismissed(true);
    hideTooltip();
  }, [hideTooltip]);

  const resetDismissalAndHideTooltip = useCallback(() => {
    setIsDismissed(false);
    if (!isOverlayOpenRef.current) {
      isInteractionSuppressedRef.current = false;
    }
    hideTooltip();
  }, [hideTooltip]);

  // suppress tooltip reactivation until a new pointer/focus entry after an overlay closes.
  // some webviews report a stale :hover state after the overlay is removed, and can also
  // deliver blur/mouseleave events while the overlay is opening.
  useEffect(() => {
    if (disabled) {
      hideTooltip();
      return;
    }

    if (!allowInModal && (isAnyModalOpen || isContextMenuOpen)) {
      isInteractionSuppressedRef.current = true;
      hideTooltip();
    }
  }, [isAnyModalOpen, isContextMenuOpen, allowInModal, disabled, hideTooltip]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    const tooltipWidth = tooltipRect?.width || 150; // use actual width or fallback
    const tooltipHeight = tooltipRect?.height || 32; // use actual height or fallback
    const offset = 8;
    const padding = 8;
    const arrowPadding = 8;
    const triggerCenterX = rect.left + rect.width / 2;
    const triggerCenterY = rect.top + rect.height / 2;

    let x = 0;
    let y = 0;
    let arrowX = tooltipWidth / 2;
    let arrowY = tooltipHeight / 2;

    switch (position) {
      case 'top':
        x = rect.left + rect.width / 2;
        y = rect.top - offset;
        break;
      case 'bottom':
        x = rect.left + rect.width / 2;
        y = rect.bottom + offset;
        break;
      case 'left':
        x = rect.left - offset;
        y = rect.top + rect.height / 2;
        break;
      case 'right':
        x = rect.right + offset;
        y = rect.top + rect.height / 2;
        break;
    }

    // keep tooltip within viewport bounds
    if (position === 'top' || position === 'bottom') {
      // constrain horizontal position
      x = Math.max(
        padding + tooltipWidth / 2,
        Math.min(x, window.innerWidth - padding - tooltipWidth / 2),
      );
      // constrain vertical position
      if (position === 'top') {
        y = Math.max(padding + tooltipHeight, y);
      } else {
        y = Math.min(window.innerHeight - padding - tooltipHeight, y);
      }

      arrowX = Math.max(
        arrowPadding,
        Math.min(triggerCenterX - (x - tooltipWidth / 2), tooltipWidth - arrowPadding),
      );
    } else {
      // constrain vertical position for left/right tooltips
      y = Math.max(
        padding + tooltipHeight / 2,
        Math.min(y, window.innerHeight - padding - tooltipHeight / 2),
      );
      // constrain horizontal position
      if (position === 'left') {
        x = Math.max(padding + tooltipWidth, x);
      } else {
        x = Math.min(window.innerWidth - padding - tooltipWidth, x);
      }

      arrowY = Math.max(
        arrowPadding,
        Math.min(triggerCenterY - (y - tooltipHeight / 2), tooltipHeight - arrowPadding),
      );
    }

    setCoords({ x, y, arrowX, arrowY });
  }, [position]);

  const showTooltip = useCallback(() => {
    if (!isEnabled || isDismissed || isInteractionSuppressedRef.current) return;

    // don't show tooltip when a modal or context menu is open (unless allowInModal is true)
    if (!allowInModal && (isAnyModalOpen || isContextMenuOpen)) return;

    clearShowTimeout();

    const show = () => {
      clearAnimationFrame();
      updatePosition();
      animationFrameRef.current = requestAnimationFrame(() => {
        updatePosition();
        setIsVisible(true);
        animationFrameRef.current = null;
      });
      timeoutRef.current = null;
    };

    if (delay === 0) {
      show();
    } else {
      timeoutRef.current = setTimeout(show, delay);
    }
  }, [
    allowInModal,
    clearAnimationFrame,
    clearShowTimeout,
    delay,
    isEnabled,
    isDismissed,
    isAnyModalOpen,
    isContextMenuOpen,
    updatePosition,
  ]);

  useEffect(() => {
    return () => {
      clearShowTimeout();
      clearAnimationFrame();
    };
  }, [clearAnimationFrame, clearShowTimeout]);

  useEffect(() => {
    if (disabled || !isEnabled) return;
    const isTriggerHovered = triggerRef.current?.matches(':hover') ?? false;
    if (!isPointerInsideRef.current && !isFocusInsideRef.current && !isTriggerHovered) return;

    if (isTriggerHovered) {
      isPointerInsideRef.current = true;
    }
    showTooltip();
  }, [disabled, isEnabled, showTooltip]);

  useDismissableLayer({
    enabled: isVisible,
    type: 'tooltip',
    escapeBehavior: 'dismiss',
    onEscape: dismissTooltip,
  });

  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isEscapeKey(event)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      dismissTooltip();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, {
        capture: true,
      } as EventListenerOptions);
    };
  }, [dismissTooltip, isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const handleReposition = () => updatePosition();
    handleReposition();

    window.addEventListener('resize', handleReposition, true);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition, true);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isVisible, updatePosition]);

  // tooltip content can change while the trigger remains hovered. re-measure after the
  // new content has been laid out so the arrow stays aligned with the trigger
  useLayoutEffect(() => {
    if (!isVisible || !content) return;
    updatePosition();
  }, [content, isVisible, updatePosition]);

  const getTransformOrigin = () => {
    switch (position) {
      case 'top':
        return 'bottom center';
      case 'bottom':
        return 'top center';
      case 'left':
        return 'right center';
      case 'right':
        return 'left center';
    }
  };

  const getTransform = () => {
    switch (position) {
      case 'top':
        return 'translate(-50%, -100%)';
      case 'bottom':
        return 'translate(-50%, 0)';
      case 'left':
        return 'translate(-100%, -50%)';
      case 'right':
        return 'translate(0, -50%)';
    }
  };

  const handleTriggerKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLSpanElement>) => {
      if (!isEscapeKey(event) || !isVisible) return;

      event.preventDefault();
      event.stopPropagation();
      dismissTooltip();
    },
    [dismissTooltip, isVisible],
  );

  const getDescribedBy = (currentDescribedBy?: string) =>
    [currentDescribedBy, describedBy].filter(Boolean).join(' ') || undefined;

  const handleMouseEnter = useCallback(() => {
    isPointerInsideRef.current = true;
    if (!isOverlayOpenRef.current) {
      isInteractionSuppressedRef.current = false;
    }
    showTooltip();
  }, [showTooltip]);

  const handleMouseLeave = useCallback(() => {
    isPointerInsideRef.current = false;
    resetDismissalAndHideTooltip();
  }, [resetDismissalAndHideTooltip]);

  const handleFocus = useCallback(() => {
    isFocusInsideRef.current = true;
    // focus that the pointer produced (a click, or the app handing focus back after a dismissal)
    // is not a request for the tooltip; the pointer already shows it via hover. see useFocusOrigin
    if (document.documentElement.dataset.focusOrigin === 'pointer') return;

    if (
      !isOverlayOpenRef.current &&
      (!isInteractionSuppressedRef.current ||
        (triggerRef.current?.matches(':focus-visible') ?? false))
    ) {
      isInteractionSuppressedRef.current = false;
    }
    showTooltip();
  }, [showTooltip]);

  const handleBlur = useCallback(() => {
    isFocusInsideRef.current = false;
    resetDismissalAndHideTooltip();
  }, [resetDismissalAndHideTooltip]);

  const triggerChild =
    isValidElement<TooltipTriggerChildProps>(children) && children.type !== Fragment
      ? cloneElement(children, {
          'aria-describedby': getDescribedBy(children.props['aria-describedby']),
        })
      : children;

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the wrapper delegates hover/focus while the child remains the described interactive trigger */}
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleTriggerKeyDown}
        data-tooltip-trigger
        className={`inline-flex ${triggerClassName}`}
        aria-describedby={triggerChild === children ? describedBy : undefined}
      >
        {triggerChild}
      </span>
      {isEnabled &&
        createPortal(
          <div
            id={tooltipId}
            ref={tooltipRef}
            role="tooltip"
            className={`pointer-events-none fixed z-100 w-max max-w-[calc(100vw-1rem)] rounded-sm bg-surface-900 px-2 py-1 font-medium text-white text-xs shadow-lg dark:bg-surface-700 ${isVisible ? 'tooltip-anim animate-tooltip-in' : 'invisible'} ${className}`}
            style={
              {
                left: coords.x,
                top: coords.y,
                transformOrigin: getTransformOrigin(),
                '--tooltip-transform': getTransform(),
              } as CSSProperties
            }
          >
            {content}
            <div
              className={`absolute h-2 w-2 rotate-45 bg-surface-900 dark:bg-surface-700 ${
                position === 'top'
                  ? 'bottom-0 -translate-x-1/2 translate-y-1/2'
                  : position === 'bottom'
                    ? 'top-0 -translate-x-1/2 -translate-y-1/2'
                    : position === 'left'
                      ? 'right-0 translate-x-1/2 -translate-y-1/2'
                      : 'left-0 -translate-x-1/2 -translate-y-1/2'
              }`}
              style={
                position === 'top' || position === 'bottom'
                  ? { left: coords.arrowX }
                  : { top: coords.arrowY }
              }
            />
          </div>,
          document.body,
        )}
    </>
  );
};
