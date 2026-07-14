import { describe, expect, it } from 'vitest';
import type { Task } from '$types';
import type { FlattenedTask } from '$types/store';
import {
  flattenTasks,
  getSortableItemDisabled,
  getSortableItemId,
  getSortableItemKey,
} from '$utils/sortable';
import { makeFlattenedTask } from '../fixtures';

describe('sortable helpers', () => {
  it('keeps normal sortable items on their task id', () => {
    expect(getSortableItemId('task-c')).toBe('task-c');
  });

  it('gives drag overlays a separate sortable id', () => {
    expect(getSortableItemId('task-c', true)).toBe('task-c:drag-overlay');
  });

  it('keys sortable item renders by parent', () => {
    expect(getSortableItemKey('task-c')).toBe('task-c:root');
    expect(getSortableItemKey('task-c', 'task-b-uid')).toBe('task-c:task-b-uid');
  });

  it('disables both draggable and droppable behavior for overlays', () => {
    expect(getSortableItemDisabled(true, true)).toEqual({
      draggable: true,
      droppable: true,
    });
  });

  it('enables both sortable behaviors for active rows', () => {
    expect(getSortableItemDisabled(true)).toEqual({
      draggable: false,
      droppable: false,
    });
  });
});

const task = (id: string, uid: string, overrides: Partial<FlattenedTask> = {}): FlattenedTask =>
  makeFlattenedTask({ id, uid, title: uid, ...overrides });

describe('flattenTasks', () => {
  const noChildren = (): Task[] => [];
  const sort = (xs: Task[]) => xs;

  it('returns empty array for empty input', () => {
    expect(flattenTasks([], noChildren, sort)).toEqual([]);
  });

  it('flattens a flat list with depth=0 and empty ancestors', () => {
    const tasks = [task('a', 'A'), task('b', 'B')];
    const result = flattenTasks(tasks, noChildren, sort);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'a', depth: 0, ancestorIds: [] });
    expect(result[1]).toMatchObject({ id: 'b', depth: 0, ancestorIds: [] });
  });

  it('recurses into children when not collapsed', () => {
    const parent = task('p', 'P');
    const child = task('c', 'C');
    const result = flattenTasks([parent], (uid) => (uid === 'P' ? [child] : []), sort);
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ id: 'c', depth: 1, ancestorIds: ['p'] });
  });

  it('skips children when parent is collapsed', () => {
    const parent = task('p', 'P', { isCollapsed: true });
    const child = task('c', 'C');
    const result = flattenTasks([parent], (uid) => (uid === 'P' ? [child] : []), sort);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p');
  });

  it('tracks ancestor chain through multiple levels', () => {
    const grandparent = task('gp', 'GP');
    const parent = task('p', 'P');
    const child = task('c', 'C');
    const children: Record<string, Task[]> = { GP: [parent], P: [child] };
    const result = flattenTasks([grandparent], (uid) => children[uid] ?? [], sort);
    expect(result).toHaveLength(3);
    expect(result[2]).toMatchObject({ id: 'c', depth: 2, ancestorIds: ['gp', 'p'] });
  });

  it('applies the sort function to children', () => {
    const parent = task('p', 'P');
    const c1 = task('c1', 'C1', { sortOrder: 200 });
    const c2 = task('c2', 'C2', { sortOrder: 100 });
    const result = flattenTasks(
      [parent],
      (uid) => (uid === 'P' ? [c1, c2] : []),
      (xs) => [...xs].sort((a, b) => a.sortOrder - b.sortOrder),
    );
    expect(result.map((r) => r.id)).toEqual(['p', 'c2', 'c1']);
  });
});
