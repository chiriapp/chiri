import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useModalState } from '$context/modalStateContext';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  triggerClassName?: string;
  allowInModal?: boolean;
}

export const Tooltip = ({
  content,
  children,
  delay = 0,
  position = 'top',
  className = '',
  triggerClassName = '',
  allowInModal = false,
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isAnyModalOpen, isContextMenuOpen } = useModalState();

  // hide tooltip when a modal or context menu opens
  useEffect(() => {
    if (!allowInModal && (isAnyModalOpen || isContextMenuOpen) && isVisible) {
      setIsVisible(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isAnyModalOpen, isContextMenuOpen, isVisible, allowInModal]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width || 150; // Use actual width or fallback
    const tooltipHeight = tooltipRect.height || 32; // Use actual height or fallback
    const offset = 8;
    const padding = 8;

    let x = 0;
    let y = 0;

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

    // Keep tooltip within viewport bounds
    if (position === 'top' || position === 'bottom') {
      // Constrain horizontal position
      x = Math.max(
        padding + tooltipWidth / 2,
        Math.min(x, window.innerWidth - padding - tooltipWidth / 2),
      );
      // Constrain vertical position
      if (position === 'top') {
        y = Math.max(padding + tooltipHeight, y);
      } else {
        y = Math.min(window.innerHeight - padding - tooltipHeight, y);
      }
    } else {
      // Constrain vertical position for left/right tooltips
      y = Math.max(
        padding + tooltipHeight / 2,
        Math.min(y, window.innerHeight - padding - tooltipHeight / 2),
      );
      // Constrain horizontal position
      if (position === 'left') {
        x = Math.max(padding + tooltipWidth, x);
      } else {
        x = Math.min(window.innerWidth - padding - tooltipWidth, x);
      }
    }

    setCoords({ x, y });
  }, [position]);

  const showTooltip = () => {
    // Don't show tooltip when a modal or context menu is open (unless allowInModal is true)
    if (!allowInModal && (isAnyModalOpen || isContextMenuOpen)) return;

    const show = () => {
      updatePosition();
      setIsVisible(true);
    };

    if (delay === 0) {
      show();
    } else {
      timeoutRef.current = setTimeout(show, delay);
    }
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className={`inline-flex ${triggerClassName}`}
        role="tooltip"
      >
        {children}
      </span>
      {isVisible &&
        content &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`fixed z-100 px-2 py-1 text-xs font-medium text-white bg-surface-900 dark:bg-surface-700 rounded-sm shadow-lg pointer-events-none tooltip-anim animate-tooltip-in ${className}`}
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
              className={`absolute w-2 h-2 bg-surface-900 dark:bg-surface-700 rotate-45 ${
                position === 'top'
                  ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2'
                  : position === 'bottom'
                    ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2'
                    : position === 'left'
                      ? 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2'
                      : 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2'
              }`}
            />
          </div>,
          document.body,
        )}
    </>
  );
};
