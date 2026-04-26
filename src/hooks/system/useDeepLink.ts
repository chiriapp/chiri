import { useEffect } from 'react';
import { toastManager } from '$hooks/ui/useToast';
import { initDeepLink, registerDeepLinkHandler, unregisterDeepLinkHandler } from '$lib/deep-link';
import { loggers } from '$lib/logger';

const log = loggers.http;

/**
 * Initialises the deep link system and (in dev) shows a toast for any
 * received URL so you can verify the scheme is wired up correctly.
 *
 * In production this hook just boots the listener; specific OAuth handlers
 * (e.g. Fastmail) will register themselves via registerDeepLinkHandler().
 */
export const useDeepLink = () => {
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    // Demo handler: surface any chiri:// URL as a toast while testing.
    // Remove (or gate on import.meta.env.DEV) once real handlers are in place.
    const DEMO_PREFIX = '/';
    registerDeepLinkHandler(DEMO_PREFIX, (url) => {
      log.info('Deep link demo handler fired', { href: url.href });
      toastManager.show('Deep link received', url.href, 'info', 'deep-link-demo');
    });

    initDeepLink()
      .then((unlisten) => {
        cleanup = () => {
          unlisten();
          unregisterDeepLinkHandler(DEMO_PREFIX);
        };
      })
      .catch((err) => {
        log.warn('Failed to initialise deep link listener', { error: err });
      });

    return () => {
      cleanup?.();
      unregisterDeepLinkHandler(DEMO_PREFIX);
    };
  }, []);
};
