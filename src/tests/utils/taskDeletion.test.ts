import { describe, expect, it } from 'vitest';
import { RECENTLY_DELETED_RETENTION_DAYS } from '$constants';
import {
  getRecentlyDeletedDaysRemaining,
  getRecentlyDeletedExpirationDate,
  isDiscardableUntitledLocalDraft,
  isExpiredRecentlyDeletedTask,
} from '$utils/taskDeletion';
import { makeTask } from '../fixtures';

const createdAt = new Date('2025-01-01T00:00:00.000Z');
const modifiedAt = new Date('2025-01-01T00:00:01.000Z');

describe('isDiscardableUntitledLocalDraft', () => {
  it('discards an untouched untitled local draft', () => {
    const task = makeTask({
      title: '',
      href: undefined,
      createdAt,
      modifiedAt: createdAt,
    });

    expect(isDiscardableUntitledLocalDraft(task, [task])).toBe(true);
  });

  it('keeps an untitled local task that has been edited', () => {
    const task = makeTask({
      title: '',
      href: undefined,
      description: 'details worth recovering',
      createdAt,
      modifiedAt,
    });

    expect(isDiscardableUntitledLocalDraft(task, [task])).toBe(false);
  });

  it('keeps an untitled local task once it has changed from its initial draft state', () => {
    const task = makeTask({
      title: '',
      href: undefined,
      createdAt,
      modifiedAt,
    });

    expect(isDiscardableUntitledLocalDraft(task, [task])).toBe(false);
  });

  it('keeps an untitled local task with subtasks', () => {
    const task = makeTask({
      id: 'parent',
      uid: 'parent-uid',
      title: '',
      href: undefined,
      createdAt,
      modifiedAt: createdAt,
    });
    const child = makeTask({
      id: 'child',
      uid: 'child-uid',
      parentUid: task.uid,
    });

    expect(isDiscardableUntitledLocalDraft(task, [task, child])).toBe(false);
  });

  it('keeps a synced untitled task', () => {
    const task = makeTask({
      title: '',
      href: '/caldav/task.ics',
      createdAt,
      modifiedAt: createdAt,
    });

    expect(isDiscardableUntitledLocalDraft(task, [task])).toBe(false);
  });
});

describe('recently deleted retention', () => {
  it('expires deleted tasks after the retention window', () => {
    const now = new Date('2026-05-31T12:00:00.000Z');

    expect(
      isExpiredRecentlyDeletedTask(
        makeTask({ deletedAt: new Date('2026-05-01T12:00:00.000Z') }),
        now,
      ),
    ).toBe(true);
    expect(
      isExpiredRecentlyDeletedTask(
        makeTask({ deletedAt: new Date('2026-05-02T12:00:01.000Z') }),
        now,
      ),
    ).toBe(false);
  });

  it('reports the expiration date and remaining days', () => {
    const deletedAt = new Date('2026-05-01T12:00:00.000Z');
    const now = new Date('2026-05-21T12:00:00.000Z');

    expect(getRecentlyDeletedExpirationDate(deletedAt)).toEqual(
      new Date('2026-05-31T12:00:00.000Z'),
    );
    expect(getRecentlyDeletedDaysRemaining(deletedAt, now)).toBe(
      RECENTLY_DELETED_RETENTION_DAYS - 20,
    );
  });
});
