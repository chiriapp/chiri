import type { ReactNode, RefObject } from 'react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface FloatingDropdownFrameProps {
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  align?: 'start' | 'end';
  gap?: number;
  viewportPadding?: number;
  fallbackWidth?: number;
  fallbackHeight?: number;
  backdropClassName?: string;
  dropdownClassName?: string;
  dataAttribute?: string;
}

const DEFAULT_VIEWPORT_PADDING = 8;
const DEFAULT_GAP = 4;
const DEFAULT_FALLBACK_WIDTH = 200;
const DEFAULT_FALLBACK_HEIGHT = 260;
const DROPDOWN_BASE_CLASS =
  'fixed bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 animate-scale-in';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

export const FloatingDropdownFrame = ({
  anchorRef,
  onClose,
  children,
  align = 'end',
  gap = DEFAULT_GAP,
  viewportPadding = DEFAULT_VIEWPORT_PADDING,
  fallbackWidth = DEFAULT_FALLBACK_WIDTH,
  fallbackHeight = DEFAULT_FALLBACK_HEIGHT,
  backdropClassName = 'fixed inset-0 z-40',
  dropdownClassName = 'z-50 min-w-50',
  dataAttribute,
}: FloatingDropdownFrameProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: viewportPadding, top: viewportPadding });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const anchorRect = anchor.getBoundingClientRect();
    const dropdownRect = dropdownRef.current?.getBoundingClientRect();
    const dropdownWidth = dropdownRect?.width ?? fallbackWidth;
    const dropdownHeight = dropdownRect?.height ?? fallbackHeight;
    const maxLeft = window.innerWidth - dropdownWidth - viewportPadding;
    const maxTop = window.innerHeight - dropdownHeight - viewportPadding;

    const left = align === 'end' ? anchorRect.right - dropdownWidth : anchorRect.left;
    let top = anchorRect.bottom + gap;

    const spaceBelow = window.innerHeight - anchorRect.bottom - gap - viewportPadding;
    const spaceAbove = anchorRect.top - gap - viewportPadding;
    if (dropdownHeight > spaceBelow && spaceAbove > spaceBelow) {
      top = anchorRect.top - dropdownHeight - gap;
    }

    setPosition({
      left: clamp(left, viewportPadding, maxLeft),
      top: clamp(top, viewportPadding, maxTop),
    });
  }, [align, anchorRef, fallbackHeight, fallbackWidth, gap, viewportPadding]);

  useLayoutEffect(() => {
    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);

    window.addEventListener('resize', updatePosition, true);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePosition, true);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition]);

  const dataAttributes = dataAttribute ? { [dataAttribute]: '' } : {};

  return createPortal(
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Dropdown backdrop for closing on outside click */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Dropdown backdrop for closing on outside click */}
      <div className={backdropClassName} onClick={onClose} />
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Dropdown container stops document-level click handlers */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Dropdown container stops document-level click handlers */}
      <div
        ref={dropdownRef}
        {...dataAttributes}
        className={`${DROPDOWN_BASE_CLASS} ${dropdownClassName}`}
        style={{ left: position.left, top: position.top }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body,
  );
};
