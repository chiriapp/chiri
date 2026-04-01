import { db } from '$lib/database';
import { loggers } from '$lib/logger';
import { dataStore } from '$lib/store';
import { moveItem } from '.';

const log = loggers.dataStore;

export const reorderTags = (activeId: string, overId: string) => {
  const data = dataStore.load();
  const reordered = moveItem(data.tags, activeId, overId);
  if (!reordered) return;

  for (const tag of reordered) {
    const original = data.tags.find((t) => t.id === tag.id);
    if (original?.sortOrder !== tag.sortOrder) {
      log.info(`Updating sort_order for tag "${tag.name}": ${tag.sortOrder}`);
      db.updateTag(tag.id, { sortOrder: tag.sortOrder }).catch((e) =>
        log.error('Failed to persist tag sort order:', e),
      );
    }
  }

  dataStore.save({ ...data, tags: reordered });
};
