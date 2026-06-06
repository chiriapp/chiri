import type { CSSProperties, FocusEvent, PointerEvent, ReactNode, RefObject } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

const HOVER_FLYOUT_OPEN_EVENT = 'chiri:hover-flyout-open';
const HOVER_CLOSE_DELAY_MS = 180;
const VIEWPORT_PADDING = 8;

const FLYOUT_TOLERANCE_SIZE = 32;

interface HoverFlyoutContextValue {
  anchorRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
}

const HoverFlyoutContext = createContext<HoverFlyoutContextValue | null>(null);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

interface HoverFlyoutGroupProps {
  children: ReactNode;
}

export const HoverFlyoutGroup = ({ children }: HoverFlyoutGroupProps) => {
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current === null) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const open = useCallback(() => {
    clearCloseTimer();
    setIsOpen(true);
    window.dispatchEvent(new CustomEvent(HOVER_FLYOUT_OPEN_EVENT, { detail: id }));
  }, [clearCloseTimer, id]);

  const closeSoon = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, HOVER_CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  useEffect(() => {
    const handleOtherFlyoutOpen = (event: Event) => {
      if (!(event instanceof CustomEvent) || event.detail === id) return;
      clearCloseTimer();
      setIsOpen(false);
    };

    window.addEventListener(HOVER_FLYOUT_OPEN_EVENT, handleOtherFlyoutOpen);
    return () => {
      clearCloseTimer();
      window.removeEventListener(HOVER_FLYOUT_OPEN_EVENT, handleOtherFlyoutOpen);
    };
  }, [clearCloseTimer, id]);

  const handlePointerEnter = (_event: PointerEvent<HTMLDivElement>) => {
    open();
  };

  const handlePointerLeave = (_event: PointerEvent<HTMLDivElement>) => {
    closeSoon();
  };

  const handleFocus = (_event: FocusEvent<HTMLDivElement>) => {
    open();
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget instanceof Node && groupRef.current?.contains(event.relatedTarget)) {
      return;
    }
    closeSoon();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Hover wrapper keeps sibling flyouts open while pointer moves between real controls.
    <div
      ref={groupRef}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`hover-flyout-group relative ${isOpen ? 'is-hover-flyout-open' : ''}`}
    >
      <HoverFlyoutContext.Provider value={{ anchorRef: groupRef, isOpen }}>
        {children}
      </HoverFlyoutContext.Provider>
    </div>
  );
};

interface HoverFlyoutProps {
  side: 'left' | 'right';
  minWidthClassName?: string;
  children: ReactNode;
}

export const HoverFlyout = ({
  side,
  minWidthClassName = 'min-w-48',
  children,
}: HoverFlyoutProps) => {
  const context = useContext(HoverFlyoutContext);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties>({});
  const sideClass = side === 'left' ? 'py-8 pl-3 pr-1' : 'py-8 pl-1 pr-3';

  const updatePosition = useCallback(() => {
    const anchor = context?.anchorRef.current;
    const flyout = flyoutRef.current;
    if (!anchor || !flyout) return;

    const anchorRect = anchor.getBoundingClientRect();
    const flyoutHeight = flyout.offsetHeight;
    const top = clamp(
      anchorRect.top - FLYOUT_TOLERANCE_SIZE,
      VIEWPORT_PADDING,
      window.innerHeight - flyoutHeight - VIEWPORT_PADDING,
    );

    setPosition(
      side === 'left'
        ? { top, right: window.innerWidth - anchorRect.left }
        : { top, left: anchorRect.right },
    );
  }, [context?.anchorRef, side]);

  useLayoutEffect(() => {
    if (!context?.isOpen) {
      setPosition({});
      return;
    }

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);

    window.addEventListener('resize', updatePosition, true);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePosition, true);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [context?.isOpen, updatePosition]);

  return (
    <div ref={flyoutRef} className={`hover-flyout fixed z-60 w-max ${sideClass}`} style={position}>
      <div
        className={`hover-flyout-panel ${minWidthClassName} rounded-lg border border-surface-200 bg-white py-2 shadow-lg dark:border-surface-700 dark:bg-surface-800`}
      >
        {children}
      </div>
    </div>
  );
};
