import { invoke } from '@tauri-apps/api/core';
import { platform } from '@tauri-apps/plugin-os';
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

  // Windows uses WebView2 which is Chromium, but it's not CEF.
  if (isWindowsPlatform()) {
    isCefRuntime = false;
    return isCefRuntime;
  }

  const ua = navigator.userAgent;

  // Wry on macOS: "Mozilla/5.0 ... AppleWebKit/... Version/... Safari/..."
  // CEF: "Mozilla/5.0 ... Chrome/... Safari/..." (has Chrome but not "Version" from Safari)
  const hasChrome = ua.includes('Chrome/');
  const hasSafariVersion = ua.includes('Version/') && ua.includes('Safari/');
  const hasEdge = ua.includes('Edg/');

  isCefRuntime = hasChrome && !hasSafariVersion && !hasEdge;

  return isCefRuntime;
};

/**
 * Detect if running on macOS platform
 */
export const isMacPlatform = () => {
  return platform() === 'macos';
};

/**
 * Detect if running on Linux platform
 */
export const isLinuxPlatform = () => {
  return platform() === 'linux';
};

/**
 * Detect if running on Windows platform
 */
export const isWindowsPlatform = () => {
  return platform() === 'windows';
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
