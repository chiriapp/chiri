/**
 * settings import/export utility functions
 */

import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { downloadFile } from '$utils/misc';

/**
 * export settings to a file
 */
export const exportSettingsToFile = async (
  settingsJson: string,
  fileName = 'chiri-settings.json',
) => {
  try {
    const path = await save({
      defaultPath: fileName,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (path) {
      await writeTextFile(path, settingsJson);
    }
  } catch (_e) {
    // fallback to browser download
    downloadFile(settingsJson, fileName, 'application/json');
  }
};

/**
 * import settings from a file
 */
export const importSettingsFromFile = async (onImport: (content: string) => boolean) => {
  try {
    const path = await open({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      multiple: false,
    });

    if (path) {
      const content = await readTextFile(path as string);
      const success = onImport(content);
      if (!success) {
        alert('Failed to import settings. Invalid format.');
      }
    }
  } catch (_e) {
    // fallback to browser file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];

      if (file) {
        const content = await file.text();
        const success = onImport(content);
        if (!success) {
          alert('Failed to import settings. Invalid format.');
        }
      }
    };

    input.click();
  }
};
