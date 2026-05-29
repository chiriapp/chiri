import { invoke } from '@tauri-apps/api/core';
import type { SystemRegionPreferences } from '$types/preference';

let cachedRegionPreferences: Promise<SystemRegionPreferences> | null = null;

export const getSystemRegionPreferences = () => {
  cachedRegionPreferences ??= invoke<SystemRegionPreferences>('get_system_region_preferences');
  return cachedRegionPreferences;
};
