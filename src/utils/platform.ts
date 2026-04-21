import { invoke } from '@tauri-apps/api/core';
import { loggers } from '$lib/logger';

let isCefRuntime: boolean | null = null;
const log = loggers.platform;

/**
 * Detect if running under CEF (Chromium Embedded Framework) runtime
 */
export const isCEF = () => {
  if (isCefRuntime !== null) {
    return isCefRuntime;
  }

  const ua = navigator.userAgent;

  // Wry on macOS: "Mozilla/5.0 ... AppleWebKit/... Version/... Safari/..."
  // CEF: "Mozilla/5.0 ... Chrome/... Safari/..." (has Chrome but not "Version" from Safari)
  const hasChrome = ua.includes('Chrome/');
  const hasSafariVersion = ua.includes('Version/') && ua.includes('Safari/');

  isCefRuntime = hasChrome && !hasSafariVersion;

  return isCefRuntime;
};

/**
 * Detect if running on macOS platform
 */
export const isMacPlatform = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return /Mac/.test(navigator.userAgent);
};

/**
 * Detect if running on Linux platform
 */
export const isLinuxPlatform = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return /Linux/.test(navigator.userAgent) && !/Android/.test(navigator.userAgent);
};

/**
 * Check if in-app updates should be disabled.
 * Returns true for installations managed by external package managers.
 */
export const shouldDisableUpdates = async (): Promise<boolean> => {
  try {
    return await invoke<boolean>('should_disable_updates');
  } catch (error) {
    log.error('[Platform] Failed to check installation type:', error);
    return false;
  }
};
