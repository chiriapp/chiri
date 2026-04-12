import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAllAccounts } from '$lib/store/accounts';

interface UseOfflineOptions {
  onOnline?: () => void;
  onOffline?: () => void;
}

const CHECK_INTERVAL = 30000;
const REQUEST_TIMEOUT = 5000;

/**
 * Try to reach a server URL. Any HTTP response (including 401/403/500)
 * means the host is reachable — only a network error or timeout means it isn't.
 */
const tryServer = async (url: string, signal: AbortSignal): Promise<boolean> => {
  const response = await tauriFetch(url, {
    method: 'GET',
    signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT)]),
  });
  return response != null;
};

/**
 * Check connectivity by probing the user's configured account servers.
 * Falls back to navigator.onLine when no accounts are configured yet.
 */
const checkAccountServers = async (controller: AbortController): Promise<boolean> => {
  const accounts = getAllAccounts().filter(a => a.isActive);

  if (accounts.length === 0) {
    return navigator.onLine;
  }

  for (const account of accounts) {
    try {
      if (await tryServer(account.serverUrl, controller.signal)) {
        return true;
      }
    } catch (_) {
      if (controller.signal.aborted) throw new Error('Aborted');
      // Try next account
    }
  }
  return false;
};

export const useOffline = (options: UseOfflineOptions = {}) => {
  const [isOffline, setIsOffline] = useState(false);
  const isOfflineRef = useRef(false);
  const checkIntervalRef = useRef<number | null>(null);
  const isCheckingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const onOnlineRef = useRef(options.onOnline);
  const onOfflineRef = useRef(options.onOffline);

  onOnlineRef.current = options.onOnline;
  onOfflineRef.current = options.onOffline;

  const setOnline = useCallback(() => {
    const wasOffline = isOfflineRef.current;
    isOfflineRef.current = false;
    setIsOffline(false);
    if (wasOffline) onOnlineRef.current?.();
  }, []);

  const setOffline = useCallback(() => {
    const wasOnline = !isOfflineRef.current;
    isOfflineRef.current = true;
    setIsOffline(true);
    if (wasOnline) onOfflineRef.current?.();
  }, []);

  const checkConnectivity = useCallback(async () => {
    // navigator.onLine === false is a reliable signal we're definitely offline
    if (!navigator.onLine) {
      setOffline();
      return;
    }

    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const isOnline = await checkAccountServers(controller);
      if (isOnline) {
        setOnline();
      } else {
        setOffline();
      }
    } catch (_) {
      if (!controller.signal.aborted) {
        setOffline();
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, [setOnline, setOffline]);

  useEffect(() => {
    checkConnectivity();

    checkIntervalRef.current = window.setInterval(checkConnectivity, CHECK_INTERVAL);

    // navigator offline event is reliable for "definitely offline"
    const handleOffline = () => setOffline();
    // navigator online event means the adapter is up — verify by probing
    const handleOnline = () => checkConnectivity();
    const handleFocus = () => checkConnectivity();

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);

    return () => {
      abortControllerRef.current?.abort();
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkConnectivity, setOffline]);

  return { isOffline, isOfflineRef };
};
