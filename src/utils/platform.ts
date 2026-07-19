import { invoke } from '@tauri-apps/api/core';
import { platform } from '@tauri-apps/plugin-os';
import { loggers } from '$lib/logger';
import type { InstallType } from '$types';

const log = loggers.platform;

const platformDisplayNames: Record<string, string> = {
  dragonfly: 'DragonFly BSD',
  freebsd: 'FreeBSD',
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
 * detect if running on macOS platform
 */
export const isMacPlatform = () => {
  return platform() === 'macos';
};

/**
 * detect if running on Linux platform
 */
export const isLinuxPlatform = () => {
  return platform() === 'linux';
};

/**
 * detect if running on Windows platform
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
    case 'appimage':
      return 'AppImage';
    case 'nix':
      return 'Nix';
    case 'aur':
      return 'AUR (Arch User Repository)';
    case 'copr':
      return 'Fedora Copr';
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
 * check if in-app updates should be disabled
 * returns true for installations managed by external package managers
 */
export const shouldDisableUpdates = async () => {
  try {
    return await invoke<boolean>('should_disable_updates');
  } catch (error) {
    log.error('[Platform] Failed to check installation type:', error);
    return false;
  }
};

/**
 * returns true when running as an AppImage on Linux
 */
export const isAppImageInstall = async () => {
  try {
    return (await invoke<InstallType>('get_install_type')) === 'appimage';
  } catch (error) {
    log.error('[Platform] Failed to detect AppImage install:', error);
    return false;
  }
};

/**
 * returns the cached tray host availability from the backend
 */
export const getTrayHostAvailable = async () => {
  try {
    return await invoke<boolean>('get_tray_host_available');
  } catch (error) {
    log.error('Failed to read tray host availability:', error);
    return false;
  }
};

/**
 * returns true when the AppImage desktop integration prompt should be shown
 */
export const isAppImageDesktopIntegrationNeeded = async () => {
  if (!isLinuxPlatform()) {
    return false;
  }

  try {
    return await invoke<boolean>('is_appimage_desktop_integration_needed');
  } catch (error) {
    log.error('[Platform] Failed to check AppImage integration prompt:', error);
    return false;
  }
};

/**
 * returns true when the AppImage desktop file is installed
 */
export const isAppImageDesktopFileInstalled = async () => {
  if (!isLinuxPlatform()) {
    return false;
  }

  try {
    return await invoke<boolean>('is_appimage_desktop_file_installed');
  } catch (error) {
    log.error('[Platform] Failed to check AppImage desktop file:', error);
    return false;
  }
};

/**
 * install the AppImage desktop file and icon into the user's home directory
 */
export const installAppImageDesktopIntegration = async () => {
  if (!isLinuxPlatform()) {
    return false;
  }

  try {
    await invoke('install_appimage_desktop_integration');
    return true;
  } catch (error) {
    log.error('[Platform] Failed to install AppImage desktop integration:', error);
    return false;
  }
};

/**
 * decline the AppImage desktop integration prompt
 */
export const skipAppImageDesktopIntegration = async () => {
  if (!isLinuxPlatform()) {
    return false;
  }

  try {
    await invoke('skip_appimage_desktop_integration');
    return true;
  } catch (error) {
    log.error('[Platform] Failed to skip AppImage desktop integration:', error);
    return false;
  }
};

/**
 * remove the installed AppImage desktop file
 */
export const removeAppImageDesktopIntegration = async () => {
  if (!isLinuxPlatform()) {
    return false;
  }

  try {
    await invoke('remove_appimage_desktop_integration');
    return true;
  } catch (error) {
    log.error('[Platform] Failed to remove AppImage desktop integration:', error);
    return false;
  }
};
