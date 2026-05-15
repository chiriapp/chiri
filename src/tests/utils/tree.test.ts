import { describe, expect, it } from 'vitest';
import type { Task } from '$types';
import { calculateNewPositions, type FlattenedTask, flattenTasks } from '$utils/tree';
import { makeFlattenedTask } from '../fixtures';

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

describe('calculateNewPositions', () => {
  it('returns empty map if active or over is not found', () => {
    const items: FlattenedTask[] = [task('a', 'A', { ancestorIds: [], depth: 0 })];
    expect(calculateNewPositions(items, 'missing', 'a').size).toBe(0);
    expect(calculateNewPositions(items, 'a', 'missing').size).toBe(0);
  });

  it('refuses to drop a parent into its own descendant', () => {
    const parent = task('p', 'P', { ancestorIds: [], depth: 0 });
    const child = task('c', 'C', { parentUid: 'P', ancestorIds: ['p'], depth: 1 });
    const result = calculateNewPositions([parent, child], 'p', 'c');
    expect(result.size).toBe(0);
  });

  it('reorders siblings at top level', () => {
    const items: FlattenedTask[] = [
      task('a', 'A', { ancestorIds: [], depth: 0, sortOrder: 100 }),
      task('b', 'B', { ancestorIds: [], depth: 0, sortOrder: 200 }),
      task('c', 'C', { ancestorIds: [], depth: 0, sortOrder: 300 }),
    ];
    // Move 'a' down past 'b': new order = b, a, c
    const result = calculateNewPositions(items, 'a', 'b');
    const aUpdate = result.get('a');
    const bUpdate = result.get('b');
    expect(bUpdate?.sortOrder).toBeLessThan(aUpdate!.sortOrder);
  });
});
