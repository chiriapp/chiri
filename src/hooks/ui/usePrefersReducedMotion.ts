import { useEffect, useState } from 'react';

const prefersReducedMotionQuery = '(prefers-reduced-motion: reduce)';

const getPrefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia(prefersReducedMotionQuery).matches;

export const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getPrefersReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(prefersReducedMotionQuery);
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};
