import { db } from '$lib/database';
import { loggers } from '$lib/logger';
import { dataStore } from '$lib/store';
import { moveItem } from '.';

const log = loggers.dataStore;

export const reorderAccounts = (activeId: string, overId: string) => {
  const data = dataStore.load();
  const reordered = moveItem(data.accounts, activeId, overId);
  if (!reordered) return;

  for (const acc of reordered) {
    const original = data.accounts.find((a) => a.id === acc.id);
    if (original?.sortOrder !== acc.sortOrder) {
      log.info(`Updating sort_order for account "${acc.name}": ${acc.sortOrder}`);
      db.updateAccount(acc.id, { sortOrder: acc.sortOrder }).catch((e) =>
        log.error('Failed to persist account sort order:', e),
      );
    }
  }

  dataStore.save({ ...data, accounts: reordered });
};
