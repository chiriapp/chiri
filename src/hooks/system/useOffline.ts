import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { settingsStore } from '$context/settingsContext';
import { loggers } from '$lib/logger';
import { runConnectivityCheck } from '$lib/network/connectivity';

const log = loggers.connectivity;

let hasLoggedConnectivityStart = false;

interface UseOfflineOptions {
  onOnline?: () => void;
  onOffline?: () => void;
}

export const useOffline = (options: UseOfflineOptions = {}) => {
  const { connectivityCheckEnabled, connectivityCheckInterval, connectivityRequestTimeout } =
    useSyncExternalStore(
      settingsStore.subscribe,
      settingsStore.getSnapshot,
      settingsStore.getSnapshot,
    );

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const isOfflineRef = useRef(!navigator.onLine);
  const checkIntervalRef = useRef<number | null>(null);
  const isCheckingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const onOnlineRef = useRef(options.onOnline);
  const onOfflineRef = useRef(options.onOffline);

  // keep refs current without triggering re-renders
  onOnlineRef.current = options.onOnline;
  onOfflineRef.current = options.onOffline;

  const setOnline = useCallback(() => {
    const wasOffline = isOfflineRef.current;
    isOfflineRef.current = false;
    setIsOffline(false);
    if (wasOffline) {
      log.info('Network restored, now online');
      onOnlineRef.current?.();
    }
  }, []);

  const setOffline = useCallback(() => {
    const wasOnline = !isOfflineRef.current;
    isOfflineRef.current = true;
    setIsOffline(true);
    if (wasOnline) {
      log.info('Network lost, now offline');
      onOfflineRef.current?.();
    }
  }, []);

  const runCheck = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    const showReconnecting = isOfflineRef.current;
    if (showReconnecting) {
      setIsReconnecting(true);
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await runConnectivityCheck({
        signal: controller.signal,
        externalCheckEnabled: connectivityCheckEnabled,
        requestTimeoutMs: connectivityRequestTimeout * 1000,
      });
      if (result.online) {
        setOnline();
      } else {
        setOffline();
      }
    } catch (_) {
      // aborted, don't change state
    } finally {
      isCheckingRef.current = false;
      if (showReconnecting) {
        setIsReconnecting(false);
      }
    }
  }, [connectivityCheckEnabled, connectivityRequestTimeout, setOnline, setOffline]);

  useEffect(() => {
    if (!hasLoggedConnectivityStart) {
      log.info(`Starting connectivity checks (interval: ${connectivityCheckInterval}s)`);
      hasLoggedConnectivityStart = true;
    }
    runCheck();

    checkIntervalRef.current = window.setInterval(runCheck, connectivityCheckInterval * 1000);

    // these may not fire reliably in Tauri/WKWebView, but use as fast paths when they do
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

  return { isOffline, isOfflineRef, isReconnecting };
};
