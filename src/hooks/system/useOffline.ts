import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { settingsStore } from '$context/settingsContext';
import { loggers } from '$lib/logger';
import { getAllAccounts } from '$lib/store/accounts';

const log = loggers.connectivity;

interface UseOfflineOptions {
  onOnline?: () => void;
  onOffline?: () => void;
}

const REQUEST_TIMEOUT = 5000;

export const DEFAULT_CONNECTIVITY_CHECK_URL = 'https://detectportal.firefox.com/success.txt';

const tryUrl = async (url: string, signal: AbortSignal): Promise<boolean> => {
  const response = await tauriFetch(url, {
    method: 'GET',
    signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT)]),
  });
  return response != null;
};

/**
 * 1. Try each active CalDAV account — any response means we're online.
 * 2. If all fail, hit a single external tiebreaker to distinguish
 *    "server(s) down" from "no network."
 * 3. No accounts configured → go straight to tiebreaker.
 */
const checkConnectivity = async (controller: AbortController): Promise<boolean> => {
  const accounts = getAllAccounts().filter((a) => a.isActive);

  for (const account of accounts) {
    try {
      if (await tryUrl(account.serverUrl, controller.signal)) {
        log.debug(`Reachable: ${account.serverUrl}`);
        return true;
      }
      log.debug(`Unreachable: ${account.serverUrl}`);
    } catch (_) {
      if (controller.signal.aborted) throw new Error('Aborted');
      log.debug(`Probe failed: ${account.serverUrl}`);
    }
  }

  // All CalDAV probes failed (or no accounts) — use tiebreaker
  const tiebreakerUrl =
    settingsStore.getState().connectivityCheckUrl || DEFAULT_CONNECTIVITY_CHECK_URL;
  log.debug(`Falling back to tiebreaker: ${tiebreakerUrl}`);
  try {
    const result = await tryUrl(tiebreakerUrl, controller.signal);
    log.debug(`Tiebreaker: ${result ? 'online' : 'offline'}`);
    return result;
  } catch (_) {
    if (controller.signal.aborted) throw new Error('Aborted');
    log.debug('Tiebreaker failed — offline');
    return false;
  }
};

export const useOffline = (options: UseOfflineOptions = {}) => {
  const { connectivityCheckInterval } = useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getSnapshot,
    settingsStore.getSnapshot,
  );

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const isOfflineRef = useRef(!navigator.onLine);
  const checkIntervalRef = useRef<number | null>(null);
  const isCheckingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const onOnlineRef = useRef(options.onOnline);
  const onOfflineRef = useRef(options.onOffline);

  // Keep refs current without triggering re-renders
  onOnlineRef.current = options.onOnline;
  onOfflineRef.current = options.onOffline;

  const setOnline = useCallback(() => {
    const wasOffline = isOfflineRef.current;
    isOfflineRef.current = false;
    setIsOffline(false);
    if (wasOffline) {
      log.info('Network restored — now online');
      onOnlineRef.current?.();
    }
  }, []);

  const setOffline = useCallback(() => {
    const wasOnline = !isOfflineRef.current;
    isOfflineRef.current = true;
    setIsOffline(true);
    if (wasOnline) {
      log.info('Network lost — now offline');
      onOfflineRef.current?.();
    }
  }, []);

  const runCheck = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (await checkConnectivity(controller)) {
        setOnline();
      } else {
        setOffline();
      }
    } catch (_) {
      // aborted — don't change state
    } finally {
      isCheckingRef.current = false;
    }
  }, [setOnline, setOffline]);

  useEffect(() => {
    log.info(`Starting connectivity checks (interval: ${connectivityCheckInterval}s)`);
    runCheck();

    checkIntervalRef.current = window.setInterval(runCheck, connectivityCheckInterval * 1000);

    // These may not fire reliably in Tauri/WKWebView, but use as fast paths when they do
    const handleOnline = () => runCheck();
    const handleOffline = () => setOffline();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      abortControllerRef.current?.abort();
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [runCheck, setOffline, connectivityCheckInterval]);

  return { isOffline, isOfflineRef };
};
