import { MOBILE_CONFIG_EXTENSION } from '$lib/mobileconfig';
import { generateMobileConfig } from '$lib/mobileconfig/generate';
import type { Account } from '$types';
import type { MobileConfigExportResult, MobileConfigGenerationOptions } from '$types/mobileconfig';
import { saveTextFile } from '$utils/fs';

export const getMobileConfigFileName = (account: Pick<Account, 'name'>) => {
  const safeName = account.name
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return `${safeName ? `${safeName}_` : ''}caldav${MOBILE_CONFIG_EXTENSION}`;
};

export const exportMobileConfigFile = async (
  account: Account,
  options: MobileConfigGenerationOptions = {},
): Promise<MobileConfigExportResult> => {
  const xml = generateMobileConfig(account, options);
  const fileName = getMobileConfigFileName(account);

  return saveTextFile(xml, {
    defaultPath: fileName,
    filterName: 'Apple Configuration Profile',
    extensions: ['mobileconfig'],
  });
};
