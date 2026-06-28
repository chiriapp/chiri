import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { MOBILE_CONFIG_EXTENSION, MOBILE_CONFIG_MIME_TYPE } from '$lib/mobileconfig';
import { generateMobileConfig } from '$lib/mobileconfig/generate';
import type { Account } from '$types';
import type { MobileConfigExportResult, MobileConfigGenerationOptions } from '$types/mobileconfig';
import { downloadFile } from '$utils/misc';

export const getMobileConfigFileName = (account: Pick<Account, 'name'>) => {
  const safeName = account.name
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return `${safeName ? `${safeName}_` : ''}caldav${MOBILE_CONFIG_EXTENSION}`;
};

const isSaveDialogCancellation = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('cancelled') || message.includes('user closed');
};

export const exportMobileConfigFile = async (
  account: Account,
  options: MobileConfigGenerationOptions = {},
): Promise<MobileConfigExportResult> => {
  const xml = generateMobileConfig(account, options);
  const fileName = getMobileConfigFileName(account);

  try {
    const path = await save({
      defaultPath: fileName,
      filters: [{ name: 'Apple Configuration Profile', extensions: ['mobileconfig'] }],
    });

    if (!path) return 'cancelled';

    await writeTextFile(path, xml);
    return 'saved';
  } catch (error) {
    if (isSaveDialogCancellation(error)) return 'cancelled';

    downloadFile(xml, fileName, MOBILE_CONFIG_MIME_TYPE);
    return 'downloaded';
  }
};
