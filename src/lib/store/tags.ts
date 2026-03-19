/**
 * Tag operations
 */

import * as db from '$lib/database';
import { loggers } from '$lib/logger';
import { loadDataStore, saveDataStore } from '$lib/store';
import type { Tag } from '$types/index';
import { FALLBACK_ITEM_COLOR } from '$utils/constants';
import { generateUUID } from '$utils/misc';

const log = loggers.dataStore;

export const getAllTags = () => {
  return loadDataStore().tags;
};

// Alias for getAllTags (for compatibility)
export const getTags = () => {
  return getAllTags();
};

export const getTagById = (id: string) => {
  return loadDataStore().tags.find((t) => t.id === id);
};

export const createTag = (tagData: Partial<Tag>) => {
  const data = loadDataStore();

  const tag: Tag = {
    id: generateUUID(),
    name: tagData.name ?? 'New Tag',
    color: tagData.color ?? FALLBACK_ITEM_COLOR,
    icon: tagData.icon,
    emoji: tagData.emoji,
  } satisfies Tag;

  // Persist to SQLite
  db.createTag(tag).catch((e) => log.error('Failed to persist tag:', e));

  saveDataStore({ ...data, tags: [...data.tags, tag] });
  return tag;
};

export const updateTag = (id: string, updates: Partial<Tag>) => {
  const data = loadDataStore();
  let updatedTag: Tag | undefined;

  const tags = data.tags.map((tag) => {
    if (tag.id === id) {
      updatedTag = { ...tag, ...updates } satisfies Tag;
      return updatedTag;
    }
    return tag;
  });

  // Persist to SQLite
  if (updatedTag) {
    db.updateTag(id, updates).catch((e) => log.error('Failed to persist tag update:', e));
  }

  saveDataStore({ ...data, tags });
  return updatedTag;
};

export const deleteTag = (id: string) => {
  const data = loadDataStore();

  // Persist to SQLite
  db.deleteTag(id).catch((e) => log.error('Failed to persist tag deletion:', e));

  saveDataStore({
    ...data,
    tags: data.tags.filter((tag) => tag.id !== id),
    tasks: data.tasks.map((task) => ({
      ...task,
      tags: (task.tags ?? []).filter((t) => t !== id),
    })),
    ui: {
      ...data.ui,
      activeTagId: data.ui.activeTagId === id ? null : data.ui.activeTagId,
    },
  });
};
