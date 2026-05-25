import { useEffect, useEffectEvent, useRef } from 'react';
import {
  type DismissableLayerEscapeBehavior,
  type DismissableLayerType,
  getDismissableLayerPriority,
  useDismissableLayerContext,
} from '$context/dismissableLayerContext';

interface UseDismissableLayerOptions {
  enabled?: boolean;
  type: DismissableLayerType;
  priority?: number;
  escapeBehavior?: DismissableLayerEscapeBehavior;
  onEscape?: (event: KeyboardEvent) => void;
}

export const useDismissableLayer = ({
  enabled = true,
  type,
  priority,
  escapeBehavior,
  onEscape,
}: UseDismissableLayerOptions) => {
  const { registerLayer } = useDismissableLayerContext();
  const idRef = useRef<symbol>(Symbol('dismissable-layer'));
  const onEscapeEvent = useEffectEvent((event: KeyboardEvent) => {
    onEscape?.(event);
  });
  const hasEscapeHandler = onEscape !== undefined;
  const resolvedEscapeBehavior =
    escapeBehavior ?? (hasEscapeHandler ? 'dismiss' : 'block');
  const resolvedPriority = priority ?? getDismissableLayerPriority(type);

  useEffect(() => {
    if (!enabled) return;

    return registerLayer({
      id: idRef.current,
      type,
      priority: resolvedPriority,
      escapeBehavior: resolvedEscapeBehavior,
      onEscape: hasEscapeHandler ? onEscapeEvent : undefined,
    });
  }, [enabled, type, resolvedPriority, resolvedEscapeBehavior, hasEscapeHandler, registerLayer]);
};
