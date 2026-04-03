import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseOfflineOptions {
  onOnline?: () => void;
  onOffline?: () => void;
}

/**
 * Reliable endpoints that return predictable responses to check internet connectivity.
 */
const CONNECTIVITY_ENDPOINTS = [
  'https://www.google.com/generate_204',
  'https://captive.apple.com/hotspot-detect.html',
  'https://www.cloudflare.com/cdn-cgi/trace',
  'https://detectportal.firefox.com',
] as const;

const CHECK_INTERVAL = 5000;
const REQUEST_TIMEOUT = 3000;

/**
 * Check if a response indicates a successful connection
 */
const isSuccessfulResponse = (response: unknown): boolean => {
  if (!response || typeof response !== 'object' || !('status' in response)) {
    return false;
  }
  const status = (response as { status: number }).status;
  return status >= 200 && status < 400;
};

/**
 * Try to fetch a single endpoint to check connectivity
 */
const tryEndpoint = async (endpoint: string, signal: AbortSignal): Promise<boolean> => {
  const response = await tauriFetch(endpoint, {
    method: 'GET',
    signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT)]),
  });
  return isSuccessfulResponse(response);
};

/**
 * Try all endpoints in sequence until one succeeds
 */
const checkAllEndpoints = async (controller: AbortController): Promise<boolean> => {
  for (const endpoint of CONNECTIVITY_ENDPOINTS) {
    try {
      if (await tryEndpoint(endpoint, controller.signal)) {
        return true;
      }
    } catch (_) {
      if (controller.signal.aborted) throw new Error('Aborted');
      // Try next endpoint
    }
  }
  return false;
};

export const useOffline = (options: UseOfflineOptions = {}) => {
  const [isOffline, setIsOffline] = useState(false);
  const isOfflineRef = useRef(false); // Synchronous ref for immediate reads
  const checkIntervalRef = useRef<number | null>(null);
  const isCheckingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const onOnlineRef = useRef(options.onOnline);
  const onOfflineRef = useRef(options.onOffline);

  // Keep refs current without triggering re-renders
  onOnlineRef.current = options.onOnline;
  onOfflineRef.current = options.onOffline;

  const checkConnectivity = useCallback(async () => {
    // Prevent multiple simultaneous checks
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const isOnline = await checkAllEndpoints(controller);

      if (isOnline) {
        const wasOffline = isOfflineRef.current;
        isOfflineRef.current = false;
        setIsOffline(false);
        if (wasOffline) onOnlineRef.current?.();
      } else {
        const wasOnline = !isOfflineRef.current;
        isOfflineRef.current = true;
        setIsOffline(true);
        if (wasOnline) onOfflineRef.current?.();
      }
    } catch (_) {
      // On error (including abort), assume offline if not aborted
      if (!controller.signal.aborted) {
        const wasOnline = !isOfflineRef.current;
        isOfflineRef.current = true;
        setIsOffline(true);
        if (wasOnline) onOfflineRef.current?.();
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkConnectivity();

    // Set up periodic checks
    checkIntervalRef.current = window.setInterval(checkConnectivity, CHECK_INTERVAL);

    // Also check when window regains focus
    const handleFocus = () => checkConnectivity();
    window.addEventListener('focus', handleFocus);

    return () => {
      abortControllerRef.current?.abort();
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkConnectivity]);

  return { isOffline, isOfflineRef };
};
