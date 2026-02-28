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

export function useOffline(options: UseOfflineOptions = {}) {
  const [isOffline, setIsOffline] = useState(false);
  const isOfflineRef = useRef(false); // Synchronous ref for immediate reads
  const checkIntervalRef = useRef<number | null>(null);
  const isCheckingRef = useRef(false);
  const onOnlineRef = useRef(options.onOnline);
  const onOfflineRef = useRef(options.onOffline);

  // Keep refs up to date
  useEffect(() => {
    onOnlineRef.current = options.onOnline;
    onOfflineRef.current = options.onOffline;
  }, [options.onOnline, options.onOffline]);

  const checkConnectivity = useCallback(async () => {
    // Prevent multiple simultaneous checks
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      // Try each endpoint until one succeeds
      for (const endpoint of CONNECTIVITY_ENDPOINTS) {
        try {
          const response = await Promise.race([
            tauriFetch(endpoint, {
              method: 'GET',
              connectTimeout: REQUEST_TIMEOUT,
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), REQUEST_TIMEOUT),
            ),
          ]);

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
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkConnectivity]);

  return { isOffline, isOfflineRef };
}
