import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { loggers } from '$lib/logger';

const log = loggers.http;

type DeepLinkHandler = (url: URL) => void;

const handlers = new Map<string, DeepLinkHandler>();

/** register a handler for a specific deep link path prefix, e.g. "/oauth2/redirect" */
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

  // always bring the window forward. the user just completed an action in
  // their browser (e.g. OAuth) and expects the app to appear
  await bringToFront();

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    log.warn('Received malformed deep link URL', { url: rawUrl });
    return;
  }
  // match longest prefix first so specific handlers win over catch-all ones
  const sorted = [...handlers.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [prefix, handler] of sorted) {
    if (parsed.pathname.startsWith(prefix)) {
      handler(parsed);
      return;
    }
  }
  log.warn('No handler registered for deep link path', { path: parsed.pathname });
};

/**
 * initialise the deep link listener. Call once at app startup
 * returns a cleanup function
 */
export const initDeepLink = async (): Promise<() => void> => {
  // handle URLs that launched the app cold (e.g. clicked a link while app was closed)
  const launchUrls = await getCurrent();
  if (launchUrls) {
    for (const url of launchUrls) {
      void dispatch(url);
    }
  }

  // handle URLs delivered to a running instance
  const unlisten = await onOpenUrl((urls) => {
    for (const url of urls) {
      void dispatch(url);
    }
  });

  return unlisten;
};
