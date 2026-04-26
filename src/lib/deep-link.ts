import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { loggers } from '$lib/logger';

const log = loggers.http;

export type DeepLinkHandler = (url: URL) => void;

const handlers = new Map<string, DeepLinkHandler>();

/** Register a handler for a specific deep link path prefix, e.g. "/oauth2/redirect". */
export const registerDeepLinkHandler = (pathPrefix: string, handler: DeepLinkHandler) => {
  handlers.set(pathPrefix, handler);
};

export const unregisterDeepLinkHandler = (pathPrefix: string) => {
  handlers.delete(pathPrefix);
};

const bringToFront = async () => {
  try {
    const win = getCurrentWindow();
    await win.show();
    await win.setFocus();
  } catch (err) {
    log.warn('Failed to focus window on deep link', { error: err });
  }
};

const dispatch = async (rawUrl: string) => {
  log.info('Deep link received', { url: rawUrl });

  // Always bring the window forward — the user just completed an action in
  // their browser (e.g. OAuth) and expects the app to appear.
  await bringToFront();

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    log.warn('Received malformed deep link URL', { url: rawUrl });
    return;
  }
  for (const [prefix, handler] of handlers) {
    if (parsed.pathname.startsWith(prefix)) {
      handler(parsed);
      return;
    }
  }
  log.warn('No handler registered for deep link path', { path: parsed.pathname });
};

/**
 * Initialise the deep link listener. Call once at app startup.
 * Returns a cleanup function.
 */
export const initDeepLink = async (): Promise<() => void> => {
  // Handle URLs that launched the app cold (e.g. clicked a link while app was closed)
  const launchUrls = await getCurrent();
  if (launchUrls) {
    for (const url of launchUrls) {
      void dispatch(url);
    }
  }

  // Handle URLs delivered to a running instance
  const unlisten = await onOpenUrl((urls) => {
    for (const url of urls) {
      void dispatch(url);
    }
  });

  return unlisten;
};
