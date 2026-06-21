import { MOBILE_CONFIG_EXTENSION } from '$lib/mobileconfig';
import type { Account } from '$types';

export const getMobileConfigFileName = (account: Pick<Account, 'name'>) => {
  const safeName = account.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${safeName}_caldav${MOBILE_CONFIG_EXTENSION}`;
};
