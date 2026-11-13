import { settingsStore } from '$context/settingsContext';
import { db } from '$lib/database';
import { dataStore } from '$lib/store';
import type { Filter } from '$types/filter';

export const getAllFilters = () => {
  return dataStore.load().filters;
};

export const getFilterById = (id: string) => {
  return dataStore.load().filters.find((filter) => filter.id === id);
};

export const createFilter = (filterData: Partial<Filter>) => {
  const data = dataStore.load();
  const now = new Date();
  const maxOrder = data.filters.reduce((max, filter) => Math.max(max, filter.sortOrder), 0);

  const filter: Filter = {
    id: filterData.id ?? crypto.randomUUID(),
    presetId: filterData.presetId,
    name: filterData.name ?? 'New Filter',
    icon: filterData.icon,
    emoji: filterData.emoji,
    color: filterData.color,
    combinator: filterData.combinator ?? 'all',
    criteria: filterData.criteria ?? [],
    sortOrder: filterData.sortOrder ?? maxOrder + 100,
    createdAt: filterData.createdAt ?? now,
    updatedAt: filterData.updatedAt ?? now,
  };

  db.createFilter(filter).catch((e) => console.error('Failed to persist filter:', e));

  dataStore.save({
    ...data,
    filters: [...data.filters, filter].sort((a, b) => a.sortOrder - b.sortOrder),
  });

  return filter;
};

export const updateFilter = (id: string, updates: Partial<Filter>) => {
  const data = dataStore.load();
  const existing = data.filters.find((filter) => filter.id === id);
  if (!existing) return undefined;

  const updated = { ...existing, ...updates, updatedAt: updates.updatedAt ?? new Date() };

  db.updateFilter(id, updated).catch((e) => console.error('Failed to persist filter update:', e));

  dataStore.save({
    ...data,
    filters: data.filters
      .map((filter) => (filter.id === id ? updated : filter))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  });

  return updated;
};

export const deleteFilter = (id: string) => {
  const data = dataStore.load();

  if (settingsStore.getState().defaultLaunchView === `filter:${id}`) {
    settingsStore.setDefaultLaunchView('all-tasks');
  }

  db.deleteFilter(id).catch((e) => console.error('Failed to persist filter delete:', e));

  dataStore.save({
    ...data,
    filters: data.filters.filter((filter) => filter.id !== id),
    ui:
      data.ui.activeFilterId === id
        ? {
            ...data.ui,
            activeView: 'tasks',
            activeFilterId: null,
            selectedTaskId: null,
            isEditorOpen: false,
          }
        : data.ui,
  });
};
