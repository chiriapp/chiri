import { useEffect } from 'react';
import { initDeepLink } from '$lib/deepLink';
import { loggers } from '$lib/logger';

const log = loggers.http;

/**
 * initialises the deep link system
 */
export const useDeepLink = () => {
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    initDeepLink()
      .then((unlisten) => {
        cleanup = unlisten;
      })
      .catch((err) => {
        log.warn('Failed to initialise deep link listener', { error: err });
      });

    return () => {
      cleanup?.();
    };
  }, []);
};
