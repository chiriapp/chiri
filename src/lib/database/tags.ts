import type DatabasePlugin from '@tauri-apps/plugin-sql';
import { FALLBACK_ITEM_COLOR } from '$constants';
import { rowToTag } from '$lib/database/converters';
import { getTasksByTag, updateTask } from '$lib/database/tasks';
import { setActiveTag } from '$lib/database/ui';
import type { Tag } from '$types';
import type { TagRow } from '$types/database';
import { generateUUID } from '$utils/misc';

export const getAllTags = async (conn: DatabasePlugin) => {
  const rows = await conn.select<TagRow[]>('SELECT * FROM tags ORDER BY sort_order ASC');
  return rows.map(rowToTag);
};

export const getTagById = async (conn: DatabasePlugin, id: string) => {
  const rows = await conn.select<TagRow[]>('SELECT * FROM tags WHERE id = $1', [id]);
  return rows.length > 0 ? rowToTag(rows[0]) : undefined;
};

export const createTag = async (conn: DatabasePlugin, tagData: Partial<Tag>) => {
  const maxOrderRow = await conn.select<[{ max_order: number | null }]>(
    'SELECT MAX(sort_order) as max_order FROM tags',
  );
  const maxOrder = maxOrderRow[0]?.max_order ?? 0;

  const tag: Tag = {
    id: generateUUID(),
    name: tagData.name ?? 'New Tag',
    color: tagData.color ?? FALLBACK_ITEM_COLOR,
    icon: tagData.icon,
    emoji: tagData.emoji,
    sortOrder: tagData.sortOrder || maxOrder + 100,
  };

  await conn.execute(
    'INSERT INTO tags (id, name, color, icon, emoji, sort_order) VALUES ($1,$2,$3,$4,$5,$6)',
    [tag.id, tag.name, tag.color, tag.icon || null, tag.emoji || null, tag.sortOrder],
  );

  return tag;
};

export const updateTag = async (conn: DatabasePlugin, id: string, updates: Partial<Tag>) => {
  const existing = await getTagById(conn, id);
  if (!existing) return undefined;

  const updated: Tag = { ...existing, ...updates };

  await conn.execute(
    'UPDATE tags SET name=$1, color=$2, icon=$3, emoji=$4, sort_order=$5 WHERE id=$6',
    [
      updated.name,
      updated.color,
      updated.icon || null,
      updated.emoji || null,
      updated.sortOrder,
      id,
    ],
  );

  return updated;
};

export const deleteTag = async (conn: DatabasePlugin, id: string) => {
  const tasks = await getTasksByTag(conn, id);
  for (const task of tasks) {
    await updateTask(conn, task.id, { tags: (task.tags ?? []).filter((t) => t !== id) });
  }

  await conn.execute('DELETE FROM tags WHERE id = $1', [id]);

  const uiState_rows = await conn.select<Array<{ active_tag_id: string | null }>>(
    'SELECT active_tag_id FROM ui_state WHERE id = 1',
  );
  if (uiState_rows[0]?.active_tag_id === id) {
    await setActiveTag(conn, null);
  }
};
