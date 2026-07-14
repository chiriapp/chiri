import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

export interface SaveTextFileOptions {
  defaultPath: string;
  filterName: string;
  extensions: string[];
}

export const saveTextFile = async (
  content: string,
  options: SaveTextFileOptions,
): Promise<'saved' | 'cancelled'> => {
  const { defaultPath, filterName, extensions } = options;

  const path = await save({
    defaultPath,
    filters: [{ name: filterName, extensions }],
  });

  if (!path) return 'cancelled';

  await writeTextFile(path, content);
  return 'saved';
};
