import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '$hooks/ui/usePrefersReducedMotion';

export const useEasedValue = (target: number): number => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);

  useEffect(() => {
    if (prefersReducedMotion) {
      valueRef.current = target;
      setValue(target);
      return;
    }

    let frame = 0;
    let previous = performance.now();

    const step = (now: number) => {
      const elapsed = Math.max(1, now - previous);
      previous = now;

      const gap = target - valueRef.current;
      // sub-half-percent gaps already round away, and a decrease (a restarted download) shouldn't animate
      if (gap <= 0 || Math.round(gap) === 0) {
        if (valueRef.current !== target) {
          valueRef.current = target;
          setValue(target);
        }
        return;
      }

      // coarse samples: one eased value feeds both the bar and its number
      valueRef.current += gap * (1 - Math.exp(-elapsed / 80));
      setValue(valueRef.current);
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, prefersReducedMotion]);

  return value;
};
