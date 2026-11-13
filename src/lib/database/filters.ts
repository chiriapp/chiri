import type DatabasePlugin from '@tauri-apps/plugin-sql';
import { DEFAULT_FILTER_DEFINITIONS } from '$constants/filters';
import { rowToFilter } from '$lib/database/converters';
import type { AppMetadataRow, FilterRow } from '$lib/database/types';
import { setAllTasksView } from '$lib/database/ui';
import type { Filter } from '$types/filter';

const DEFAULT_FILTERS_CREATED_KEY = 'default_filters_created';

export const getMetadataValue = async (conn: DatabasePlugin, key: string) => {
  const rows = await conn.select<AppMetadataRow[]>('SELECT * FROM app_metadata WHERE key = $1', [
    key,
  ]);
  return rows[0]?.value ?? null;
};

export const setMetadataValue = async (conn: DatabasePlugin, key: string, value: string) => {
  await conn.execute(
    'INSERT INTO app_metadata (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
};

export const getAllFilters = async (conn: DatabasePlugin) => {
  const rows = await conn.select<FilterRow[]>('SELECT * FROM filters ORDER BY sort_order ASC');
  return rows.map(rowToFilter);
};

export const getFilterById = async (conn: DatabasePlugin, id: string) => {
  const rows = await conn.select<FilterRow[]>('SELECT * FROM filters WHERE id = $1', [id]);
  return rows.length > 0 ? rowToFilter(rows[0]) : undefined;
};

export const createFilter = async (conn: DatabasePlugin, filterData: Partial<Filter>) => {
  const maxOrderRow = await conn.select<[{ max_order: number | null }]>(
    'SELECT MAX(sort_order) as max_order FROM filters',
  );
  const maxOrder = maxOrderRow[0]?.max_order ?? 0;
  const now = new Date();

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

  await conn.execute(
    'INSERT INTO filters (id, preset_id, name, icon, emoji, color, combinator, criteria_json, sort_order, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
    [
      filter.id,
      filter.presetId ?? null,
      filter.name,
      filter.icon ?? null,
      filter.emoji ?? null,
      filter.color ?? null,
      filter.combinator,
      JSON.stringify(filter.criteria),
      filter.sortOrder,
      filter.createdAt.toISOString(),
      filter.updatedAt.toISOString(),
    ],
  );

  return filter;
};

export const updateFilter = async (conn: DatabasePlugin, id: string, updates: Partial<Filter>) => {
  const existing = await getFilterById(conn, id);
  if (!existing) return undefined;

  const updated: Filter = {
    ...existing,
    ...updates,
    updatedAt: updates.updatedAt ?? new Date(),
  };

  await conn.execute(
    'UPDATE filters SET preset_id=$1, name=$2, icon=$3, emoji=$4, color=$5, combinator=$6, criteria_json=$7, sort_order=$8, created_at=$9, updated_at=$10 WHERE id=$11',
    [
      updated.presetId ?? null,
      updated.name,
      updated.icon ?? null,
      updated.emoji ?? null,
      updated.color ?? null,
      updated.combinator,
      JSON.stringify(updated.criteria),
      updated.sortOrder,
      updated.createdAt.toISOString(),
      updated.updatedAt.toISOString(),
      id,
    ],
  );

  return updated;
};

export const deleteFilter = async (conn: DatabasePlugin, id: string) => {
  await conn.execute('DELETE FROM filters WHERE id = $1', [id]);

  const uiRows = await conn.select<Array<{ active_filter_id: string | null }>>(
    'SELECT active_filter_id FROM ui_state WHERE id = 1',
  );
  if (uiRows[0]?.active_filter_id === id) {
    await setAllTasksView(conn);
  }
};

export const bootstrapDefaultFilters = async (conn: DatabasePlugin) => {
  const defaultsCreated = await getMetadataValue(conn, DEFAULT_FILTERS_CREATED_KEY);
  if (defaultsCreated === 'true') return;

  const existingFilters = await getAllFilters(conn);
  if (existingFilters.length === 0) {
    for (const filter of DEFAULT_FILTER_DEFINITIONS) {
      await createFilter(conn, filter);
    }
  }

  await setMetadataValue(conn, DEFAULT_FILTERS_CREATED_KEY, 'true');
};
