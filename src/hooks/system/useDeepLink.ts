import { useEffect } from 'react';
import { toastManager } from '$hooks/ui/useToast';
import { initDeepLink, registerDeepLinkHandler, unregisterDeepLinkHandler } from '$lib/deep-link';
import { loggers } from '$lib/logger';

const log = loggers.http;

/**
 * Initialises the deep link system.
 *
 * In development a catch-all handler toasts any unhandled URL so you can
 * verify the scheme is wired up. Specific handlers (e.g. Fastmail OAuth)
 * register themselves via registerDeepLinkHandler() and always win because
 * dispatch prefers the longest matching prefix.
 */
export const useDeepLink = () => {
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    // Dev-only catch-all: surfaces unhandled deep links as toasts.
    const DEMO_PREFIX = '/';
    if (import.meta.env.DEV) {
      registerDeepLinkHandler(DEMO_PREFIX, (url) => {
        log.info('Deep link catch-all handler fired', { href: url.href });
        toastManager.show('Deep link received', url.href, 'info', 'deep-link-demo');
      });
    }

    initDeepLink()
      .then((unlisten) => {
        cleanup = () => {
          unlisten();
          if (import.meta.env.DEV) unregisterDeepLinkHandler(DEMO_PREFIX);
        };
      })
      .catch((err) => {
        log.warn('Failed to initialise deep link listener', { error: err });
      });

    return () => {
      cleanup?.();
      if (import.meta.env.DEV) unregisterDeepLinkHandler(DEMO_PREFIX);
    };
  }, []);
};
