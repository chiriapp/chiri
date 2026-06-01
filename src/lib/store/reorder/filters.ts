import { db } from '$lib/database';
import { loggers } from '$lib/logger';
import { dataStore } from '$lib/store';
import { moveItem } from '.';

const log = loggers.dataStore;

export const reorderFilters = (activeId: string, overId: string) => {
  const data = dataStore.load();
  const reordered = moveItem(data.filters, activeId, overId);
  if (!reordered) return;

  for (const filter of reordered) {
    const original = data.filters.find((candidate) => candidate.id === filter.id);
    if (original?.sortOrder !== filter.sortOrder) {
      log.info(`Updating sort_order for filter "${filter.name}": ${filter.sortOrder}`);
      db.updateFilter(filter.id, { sortOrder: filter.sortOrder }).catch((e) =>
        log.error('Failed to persist filter sort order:', e),
      );
    }
  }

  dataStore.save({ ...data, filters: reordered });
};
