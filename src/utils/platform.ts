import { invoke } from '@tauri-apps/api/core';
import { platform } from '@tauri-apps/plugin-os';
import { loggers } from '$lib/logger';

const log = loggers.platform;

const platformDisplayNames: Record<string, string> = {
  android: 'Android',
  dragonfly: 'DragonFly BSD',
  freebsd: 'FreeBSD',
  ios: 'iOS',
  linux: 'Linux',
  macos: 'macOS',
  netbsd: 'NetBSD',
  openbsd: 'OpenBSD',
  solaris: 'Solaris',
  windows: 'Windows',
};

export const formatPlatformName = (platformName: string) => {
  const normalizedPlatform = platformName.toLowerCase();
  const displayName = platformDisplayNames[normalizedPlatform];

  if (displayName) {
    return displayName;
  }

  return platformName
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ');
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
