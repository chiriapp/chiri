import type { CSSProperties, MouseEventHandler, ReactNode, RefObject } from 'react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DismissableLayerType } from '$context/dismissableLayerContext';
import { useDismissableLayer } from '$hooks/ui/useDismissableLayer';
import {
  refreshStaleCursorAfterLayoutAtEventPoint,
  refreshStaleCursorAfterPointerMutation,
  resetStaleCursorOnLayerClose,
  useResetStaleCursorOnLayerOpen,
} from '$hooks/ui/useStaleCursorReset';

type FloatingLayerAnchor =
  | {
      type: 'element';
      ref: RefObject<HTMLElement | null>;
      align?: 'start' | 'end';
      gap?: number;
    }
  | {
      type: 'point';
      x: number;
      y: number;
      gap?: number;
    };

type PointerCloseCursorBehavior = 'reset-on-close' | 'reset-if-needed' | 'none';

interface FloatingLayerFrameProps {
  anchor: FloatingLayerAnchor;
  onClose: () => void;
  children?: ReactNode;
  viewportPadding?: number;
  fallbackWidth?: number;
  fallbackHeight?: number;
  backdropClassName?: string;
  layerClassName?: string;
  layerStyle?: CSSProperties;
  dataAttribute?: string;
  closeOnEscape?: boolean;
  layerType?: Extract<DismissableLayerType, 'dropdown' | 'context-menu'>;
  pointerCloseCursorBehavior?: PointerCloseCursorBehavior;
  resetCursorOnOpen?: boolean;
  onPointerClose?: MouseEventHandler<HTMLDivElement>;
}

const DEFAULT_VIEWPORT_PADDING = 8;
const DEFAULT_GAP = 4;
const DEFAULT_FALLBACK_WIDTH = 200;
const DEFAULT_FALLBACK_HEIGHT = 260;
const LAYER_BASE_CLASS =
  'fixed bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 animate-scale-in';
const Z_INDEX_CLASS_PATTERN = /\bz-(\d+)\b/;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

const getLayerPriority = (...classNames: string[]) => {
  for (const className of classNames) {
    const zIndexMatch = className.match(Z_INDEX_CLASS_PATTERN);
    if (zIndexMatch) return Number(zIndexMatch[1]);
  }

  return undefined;
};

export const FloatingLayerFrame = ({
  anchor,
  onClose,
  children,
  viewportPadding = DEFAULT_VIEWPORT_PADDING,
  fallbackWidth = DEFAULT_FALLBACK_WIDTH,
  fallbackHeight = DEFAULT_FALLBACK_HEIGHT,
  backdropClassName = 'fixed inset-0 z-40',
  layerClassName = 'z-50 min-w-50',
  layerStyle,
  dataAttribute,
  closeOnEscape = true,
  layerType = 'dropdown',
  pointerCloseCursorBehavior,
  resetCursorOnOpen = true,
  onPointerClose,
}: FloatingLayerFrameProps) => {
  const layerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: viewportPadding, top: viewportPadding });
  const anchorType = anchor.type;
  const anchorGap = anchor.gap ?? DEFAULT_GAP;
  const pointX = anchor.type === 'point' ? anchor.x : undefined;
  const pointY = anchor.type === 'point' ? anchor.y : undefined;
  const anchorRef = anchor.type === 'element' ? anchor.ref : undefined;
  const anchorAlign = anchor.type === 'element' ? anchor.align : undefined;

  const resolvedPointerCloseCursorBehavior =
    pointerCloseCursorBehavior ??
    (layerType === 'context-menu' ? 'reset-if-needed' : 'reset-on-close');

  const handleClose = useCallback(() => {
    resetStaleCursorOnLayerClose();
    onClose();
  }, [onClose]);

  const handlePointerClose: MouseEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      onPointerClose?.(event);

      if (resolvedPointerCloseCursorBehavior === 'reset-on-close') {
        resetStaleCursorOnLayerClose();
      } else if (resolvedPointerCloseCursorBehavior === 'reset-if-needed') {
        refreshStaleCursorAfterLayoutAtEventPoint(event);
      }

      onClose();
    },
    [onClose, onPointerClose, resolvedPointerCloseCursorBehavior],
  );

  const handleLayerClickCapture: MouseEventHandler<HTMLDivElement> = useCallback((event) => {
    // menu items often close themselves from their own click handler. Wait for
    // that state update, then reset only if no pointer target remains under the
    // stationary mouse
    refreshStaleCursorAfterPointerMutation(event);
  }, []);

  // WebKit can keep showing the clicked trigger's cursor after a portal/backdrop
  // appears under a stationary pointer
  useResetStaleCursorOnLayerOpen(resetCursorOnOpen);

  const updatePosition = useCallback(() => {
    const layer = layerRef.current;
    const layerWidth = layer?.offsetWidth ?? fallbackWidth;
    const layerHeight = layer?.offsetHeight ?? fallbackHeight;
    const maxLeft = window.innerWidth - layerWidth - viewportPadding;
    const maxTop = window.innerHeight - layerHeight - viewportPadding;

    if (anchorType === 'point') {
      if (pointX === undefined || pointY === undefined) return;

      const left =
        pointX + anchorGap + layerWidth <= window.innerWidth - viewportPadding
          ? pointX + anchorGap
          : pointX - layerWidth - anchorGap;
      const top =
        pointY + anchorGap + layerHeight <= window.innerHeight - viewportPadding
          ? pointY + anchorGap
          : pointY - layerHeight - anchorGap;

      setPosition({
        left: clamp(left, viewportPadding, maxLeft),
        top: clamp(top, viewportPadding, maxTop),
      });
      return;
    }

    const element = anchorRef?.current;
    if (!element) return;

    const anchorRect = element.getBoundingClientRect();
    const left = anchorAlign === 'start' ? anchorRect.left : anchorRect.right - layerWidth;
    let top = anchorRect.bottom + anchorGap;

    const spaceBelow = window.innerHeight - anchorRect.bottom - anchorGap - viewportPadding;
    const spaceAbove = anchorRect.top - anchorGap - viewportPadding;
    if (layerHeight > spaceBelow && spaceAbove > spaceBelow) {
      top = anchorRect.top - layerHeight - anchorGap;
    }

    setPosition({
      left: clamp(left, viewportPadding, maxLeft),
      top: clamp(top, viewportPadding, maxTop),
    });
  }, [
    anchorAlign,
    anchorGap,
    anchorRef,
    anchorType,
    fallbackHeight,
    fallbackWidth,
    pointX,
    pointY,
    viewportPadding,
  ]);

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

  useDismissableLayer({
    type: layerType,
    priority: getLayerPriority(layerClassName, backdropClassName),
    escapeBehavior: closeOnEscape ? 'dismiss' : 'block',
    onEscape: closeOnEscape ? handleClose : undefined,
  });

  const dataAttributes = dataAttribute ? { [dataAttribute]: '' } : {};

  return createPortal(
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Floating layer backdrop for closing on outside click */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Floating layer backdrop for closing on outside click */}
      <div
        className={backdropClassName}
        onClick={handlePointerClose}
        onContextMenu={(event) => {
          event.preventDefault();
          handlePointerClose(event);
        }}
      />

      {/* biome-ignore lint/a11y/noStaticElementInteractions: Floating layer container stops document-level click handlers */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Floating layer container stops document-level click handlers */}
      <div
        ref={layerRef}
        {...dataAttributes}
        className={`${LAYER_BASE_CLASS} ${layerClassName}`}
        style={{ ...layerStyle, left: position.left, top: position.top }}
        onClickCapture={handleLayerClickCapture}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body,
  );
};
