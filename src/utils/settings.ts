/**
 * settings import/export utility functions
 */

import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { saveTextFile } from '$utils/fs';

/**
 * export settings to a file
 */
export const exportSettingsToFile = async (
  settingsJson: string,
  fileName = 'chiri-settings.json',
) => {
  return saveTextFile(settingsJson, {
    defaultPath: fileName,
    filterName: 'JSON',
    extensions: ['json'],
  });
};

/**
 * import settings from a file
 */
export const importSettingsFromFile = async (onImport: (content: string) => boolean) => {
  const path = await open({
    filters: [{ name: 'JSON', extensions: ['json'] }],
    multiple: false,
  });

  if (!path) return;

  const content = await readTextFile(path as string);
  const success = onImport(content);
  if (!success) {
    alert('Failed to import settings. Invalid format.');
  }
};
