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
      // Try each endpoint until one succeeds
      for (const endpoint of CONNECTIVITY_ENDPOINTS) {
        try {
          const response = await tauriFetch(endpoint, {
            method: 'GET',
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(REQUEST_TIMEOUT)]),
          });

          // Any successful response means we're online
          if (response && typeof response === 'object' && 'status' in response) {
            const status = (response as { status: number }).status;
            if (status >= 200 && status < 400) {
              const wasOffline = isOfflineRef.current;
              isOfflineRef.current = false; // Update ref synchronously
              setIsOffline(false);
              // Fire callback immediately now that ref is updated
              if (wasOffline) {
                onOnlineRef.current?.();
              }
              isCheckingRef.current = false;
              return;
            }
          }
        } catch (_) {
          if (controller.signal.aborted) return;
          // Try next endpoint
        }
      }

      // All endpoints failed - we're offline
      const wasOnline = !isOfflineRef.current;
      isOfflineRef.current = true; // Update ref synchronously
      setIsOffline(true);
      // Fire callback immediately now that ref is updated
      if (wasOnline) {
        onOfflineRef.current?.();
      }
    } catch (_) {
      // On error, assume offline
      const wasOnline = !isOfflineRef.current;
      isOfflineRef.current = true; // Update ref synchronously
      setIsOffline(true);
      // Fire callback immediately now that ref is updated
      if (wasOnline) {
        onOfflineRef.current?.();
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
