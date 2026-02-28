/**
 * Platform detection utilities
 */

let isCefRuntime: boolean | null = null;

import { createLogger } from '@/lib/logger';

const log = createLogger('Platform', '#f97316');

/**
 * Detect if running under CEF (Chromium Embedded Framework) runtime
 * CEF has IPC limitations that require some features to be disabled
 */
export function isCEF(): boolean {
  if (isCefRuntime !== null) {
    return isCefRuntime;
  }

  // Detect CEF from user agent
  // CEF uses Chromium but doesn't include Safari/WebKit like Wry does
  const ua = navigator.userAgent;
  log.info('[Platform] User agent:', ua); // Log user agent for debugging

  // Wry on macOS: "Mozilla/5.0 ... AppleWebKit/... Version/... Safari/..."
  // CEF: "Mozilla/5.0 ... Chrome/... Safari/..." (has Chrome but not "Version" from Safari)
  const hasChrome = ua.includes('Chrome/');
  const hasSafariVersion = ua.includes('Version/') && ua.includes('Safari/');

  isCefRuntime = hasChrome && !hasSafariVersion;
  log.info('[Platform] Runtime detected:', isCefRuntime ? 'CEF' : 'Wry', {
    hasChrome,
    hasSafariVersion,
  });

  return isCefRuntime;
}
