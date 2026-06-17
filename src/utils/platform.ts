import { invoke } from '@tauri-apps/api/core';
import { platform } from '@tauri-apps/plugin-os';
import { loggers } from '$lib/logger';
import type { InstallType } from '$types';

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

export const getInstallType = async () => {
  try {
    return await invoke<InstallType>('get_install_type');
  } catch (error) {
    log.error('[Platform] Failed to get installation type:', error);
    return 'standard';
  }
};

export const getPackageManagerName = (installType: InstallType | null | undefined) => {
  switch (installType) {
    case 'nix':
      return 'Nix';
    case 'aur':
      return 'AUR (Arch User Repository)';
    case 'flatpak':
      return 'Flatpak';
    case 'homebrew':
      return 'Homebrew';
    case 'scoop':
      return 'Scoop';
    default:
      return 'your package manager';
  }
};

/**
 * Check if in-app updates should be disabled.
 * Returns true for installations managed by external package managers.
 */
export const shouldDisableUpdates = async () => {
  try {
    return await invoke<boolean>('should_disable_updates');
  } catch (error) {
    log.error('[Platform] Failed to check installation type:', error);
    return false;
  }
};
