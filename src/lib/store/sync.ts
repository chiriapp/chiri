/**
 * Sync-related operations
 * Handles pending deletions that need to be synced to the server
 */

import * as db from '$lib/database';
import { loggers } from '$lib/logger';
import { loadDataStore, saveDataStore } from '$lib/store';

const log = loggers.dataStore;

export const getPendingDeletions = () => {
  return loadDataStore().pendingDeletions;
};

export const clearPendingDeletion = (uid: string) => {
  const data = loadDataStore();

  // Persist to SQLite
  db.clearPendingDeletion(uid).catch((e) =>
    log.error('Failed to persist pending deletion clear:', e),
  );

  saveDataStore({
    ...data,
    pendingDeletions: data.pendingDeletions.filter((d) => d.uid !== uid),
  });
};
