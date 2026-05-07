import { getFallbackItemColor } from '$constants/colorSchemes';
import { db } from '$lib/database';
import { loggers } from '$lib/logger';
import { dataStore } from '$lib/store';
import type { Tag } from '$types';
import { generateUUID } from '$utils/misc';

const log = loggers.dataStore;

export const getAllTags = () => {
  return dataStore.load().tags;
};

export const getTagById = (id: string) => {
  return dataStore.load().tags.find((t) => t.id === id);
};

export const createTag = (tagData: Partial<Tag>) => {
  const data = dataStore.load();

  const maxExistingOrder = data.tags.reduce((max, t) => Math.max(max, t.sortOrder), 0);

  const tag: Tag = {
    id: generateUUID(),
    name: tagData.name ?? 'New Tag',
    color: tagData.color ?? getFallbackItemColor(),
    icon: tagData.icon,
    emoji: tagData.emoji,
    sortOrder: tagData.sortOrder || maxExistingOrder + 100,
  } satisfies Tag;

  db.createTag(tag).catch((e) => log.error('Failed to persist tag:', e));

  dataStore.save({ ...data, tags: [...data.tags, tag] });
  return tag;
};

interface UpdateTagOptions {
  markTaskSyncDirty?: boolean;
}

export const updateTag = (id: string, updates: Partial<Tag>, options: UpdateTagOptions = {}) => {
  const data = dataStore.load();
  const currentTag = data.tags.find((tag) => tag.id === id);
  if (!currentTag) return undefined;

  const updatedTag = { ...currentTag, ...updates } satisfies Tag;

  const tags = data.tags.map((tag) => (tag.id === id ? updatedTag : tag));

  const shouldMarkTaskSyncDirty =
    options.markTaskSyncDirty !== false &&
    updates.color !== undefined &&
    updates.color !== currentTag.color;

  const now = new Date();
  const tasksToPersist: typeof data.tasks = [];

  const tasks = shouldMarkTaskSyncDirty
    ? data.tasks.map((task) => {
        if (!(task.tags ?? []).includes(id)) return task;

        const updatedTask = {
          ...task,
          modifiedAt: now,
          synced: false,
        };
        tasksToPersist.push(updatedTask);
        return updatedTask;
      })
    : data.tasks;

  db.updateTag(id, updates).catch((e) => log.error('Failed to persist tag update:', e));

  if (tasksToPersist.length > 0) {
    for (const task of tasksToPersist) {
      db.updateTask(task.id, task).catch((e) => log.error('Failed to persist task update:', e));
    }
  }

  dataStore.save({ ...data, tags, tasks });
  return updatedTag;
};

export const deleteTag = (id: string) => {
  const data = dataStore.load();
  const now = new Date();

  db.deleteTag(id).catch((e) => log.error('Failed to persist tag deletion:', e));

  dataStore.save({
    ...data,
    tags: data.tags.filter((tag) => tag.id !== id),
    tasks: data.tasks.map((task) => {
      if (!(task.tags ?? []).includes(id)) {
        return task;
      }

      return {
        ...task,
        tags: (task.tags ?? []).filter((t) => t !== id),
        modifiedAt: now,
        synced: false,
      };
    }),
    ui: {
      ...data.ui,
      activeTagId: data.ui.activeTagId === id ? null : data.ui.activeTagId,
    },
  });
};
