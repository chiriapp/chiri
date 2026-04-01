import { db } from '$lib/database';
import { loggers } from '$lib/logger';
import { dataStore } from '$lib/store';
import { moveItem } from '.';

const log = loggers.dataStore;

export const reorderCalendars = (accountId: string, activeId: string, overId: string) => {
  const data = dataStore.load();
  const account = data.accounts.find((a) => a.id === accountId);
  if (!account) return;

  const reordered = moveItem(account.calendars, activeId, overId);
  if (!reordered) return;

  for (const cal of reordered) {
    const original = account.calendars.find((c) => c.id === cal.id);
    if (original?.sortOrder !== cal.sortOrder) {
      log.info(`Updating sort_order for calendar "${cal.displayName}": ${cal.sortOrder}`);
      db.updateCalendar(cal.id, { sortOrder: cal.sortOrder }).catch((e) =>
        log.error('Failed to persist calendar sort order:', e),
      );
    }
  }

  dataStore.save({
    ...data,
    accounts: data.accounts.map((acc) =>
      acc.id === accountId ? { ...acc, calendars: reordered } : acc,
    ),
  });
};
