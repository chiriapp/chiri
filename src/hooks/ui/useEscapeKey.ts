import { useEffect, useEffectEvent } from 'react';

interface UseEscapeKeyOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  stopImmediatePropagation?: boolean;
  capture?: boolean;
}

/**
 * Register an Escape key handler while enabled.
 */
export const useEscapeKey = (
  onEscape: (event: KeyboardEvent) => void,
  {
    enabled = true,
    preventDefault = false,
    stopPropagation = false,
    stopImmediatePropagation = false,
    capture = false,
  }: UseEscapeKeyOptions = {},
) => {
  const onEscapeEvent = useEffectEvent(onEscape);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (preventDefault) e.preventDefault();
      if (stopPropagation) e.stopPropagation();
      if (stopImmediatePropagation) e.stopImmediatePropagation();
      onEscapeEvent(e);
    };

    window.addEventListener('keydown', handleKeyDown, { capture });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture });
  }, [enabled, preventDefault, stopPropagation, stopImmediatePropagation, capture]);
};
