import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect } from '$lib/caldav/connection';
import { createTask, deleteTask, syncCalendar, updateTask } from '$lib/caldav/tasks';
import type { Calendar, Task } from '$types';
import { makeTask } from '../fixtures';
import {
  calendarHomeOverride,
  clearCalendarTasks,
  credentials,
  getOrCreateTestCalendar,
  hasIntegrationEnv,
  password,
  serverType,
  url,
  username,
} from './helpers';

const integration = hasIntegrationEnv ? describe : describe.skip;

integration('syncCalendar reconciliation (real server)', () => {
  let testCalendar: Calendar;
  let serverUrl: string;
  let calendarHome: string;

  const conn = () => ({
    serverUrl,
    credentials,
    principalUrl: calendarHome,
    calendarHome,
    serverType,
  });

  beforeAll(async () => {
    const result = await connect(
      'sync-acct',
      url!,
      username!,
      password!,
      serverType,
      calendarHomeOverride,
    );
    serverUrl = url!.replace(/\/$/, '');
    calendarHome = result.calendarHome;
    testCalendar = await getOrCreateTestCalendar(conn(), 'sync-acct', 'chiri-test-sync');
    await clearCalendarTasks(conn(), 'sync-acct', testCalendar);
  }, 30_000);

  afterAll(async () => {
    if (testCalendar) await clearCalendarTasks(conn(), 'sync-acct', testCalendar);
  }, 30_000);

  it('detects all three buckets in one sync pass against real server state', async () => {
    const stamp = Date.now();
    const keep = makeTask({
      uid: `sync-keep-${stamp}`,
      title: 'Keep me',
      accountId: 'sync-acct',
      calendarId: testCalendar.id,
    });
    const willChange = makeTask({
      uid: `sync-change-${stamp}`,
      title: 'Change me',
      accountId: 'sync-acct',
      calendarId: testCalendar.id,
    });
    const willDelete = makeTask({
      uid: `sync-delete-${stamp}`,
      title: 'Delete me',
      accountId: 'sync-acct',
      calendarId: testCalendar.id,
    });

    const keepCreated = await createTask(conn(), testCalendar, keep);
    const changeCreated = await createTask(conn(), testCalendar, willChange);
    const deleteCreated = await createTask(conn(), testCalendar, willDelete);
    expect(keepCreated && changeCreated && deleteCreated).toBeTruthy();

    await updateTask(conn(), {
      ...willChange,
      title: 'Server modified',
      href: changeCreated!.href,
      etag: changeCreated!.etag,
    } as Task);
    await deleteTask(conn(), {
      ...willDelete,
      href: deleteCreated!.href,
      etag: deleteCreated!.etag,
    } as Task);

    const localTasks: Task[] = [
      makeTask({
        id: 'local-id-change',
        uid: willChange.uid,
        title: 'Change me',
        etag: changeCreated!.etag,
        href: changeCreated!.href,
        accountId: 'sync-acct',
        calendarId: testCalendar.id,
        synced: true,
      }),
      makeTask({
        id: 'local-id-delete',
        uid: willDelete.uid,
        href: deleteCreated!.href,
        etag: deleteCreated!.etag,
        accountId: 'sync-acct',
        calendarId: testCalendar.id,
        synced: true,
      }),
      makeTask({
        id: 'local-id-keep',
        uid: keep.uid,
        href: keepCreated!.href,
        etag: keepCreated!.etag,
        accountId: 'sync-acct',
        calendarId: testCalendar.id,
        synced: true,
      }),
      makeTask({
        id: 'local-id-new',
        uid: `local-only-${stamp}`,
        accountId: 'sync-acct',
        calendarId: testCalendar.id,
        synced: false,
      }),
    ];

    const result = await syncCalendar(conn(), 'sync-acct', testCalendar, localTasks);
    expect(result).not.toBeNull();

    expect(result!.updated).toHaveLength(1);
    expect(result!.updated[0].uid).toBe(willChange.uid);
    expect(result!.updated[0].id).toBe('local-id-change');
    expect(result!.updated[0].title).toBe('Server modified');
    expect(result!.updated[0].etag).not.toBe(changeCreated!.etag);

    expect(result!.deleted).toEqual(['local-id-delete']);

    expect(result!.created.find((t) => t.uid === keep.uid)).toBeUndefined();
    expect(result!.created.find((t) => t.uid === willChange.uid)).toBeUndefined();
    expect(result!.deleted).not.toContain('local-id-new');
  }, 60_000);
});

integration('ETag conditional operations (real server)', () => {
  let testCalendar: Calendar;
  let serverUrl: string;
  let calendarHome: string;

  const conn = () => ({
    serverUrl,
    credentials,
    principalUrl: calendarHome,
    calendarHome,
    serverType,
  });

  beforeAll(async () => {
    const result = await connect(
      'etag-acct',
      url!,
      username!,
      password!,
      serverType,
      calendarHomeOverride,
    );
    serverUrl = url!.replace(/\/$/, '');
    calendarHome = result.calendarHome;
    testCalendar = await getOrCreateTestCalendar(conn(), 'etag-acct', 'chiri-test-etag');
    await clearCalendarTasks(conn(), 'etag-acct', testCalendar);
  }, 30_000);

  afterAll(async () => {
    if (testCalendar) await clearCalendarTasks(conn(), 'etag-acct', testCalendar);
  }, 30_000);

  it('updateTask refreshes the etag after a successful update', async () => {
    const task = makeTask({
      uid: `etag-update-${Date.now()}`,
      title: 'Original',
      accountId: 'etag-acct',
      calendarId: testCalendar.id,
    });

    const created = await createTask(conn(), testCalendar, task);
    expect(created).not.toBeNull();

    const updated = await updateTask(conn(), {
      ...task,
      title: 'Modified',
      href: created!.href,
      etag: created!.etag,
    } as Task);
    expect(updated).not.toBeNull();
    expect(updated?.etag).toBeTruthy();
    expect(updated?.etag).not.toBe(created!.etag);

    await deleteTask(conn(), {
      ...task,
      href: created!.href,
      etag: updated!.etag,
    } as Task);
  }, 30_000);

  it('rejects delete with stale etag (412 Precondition Failed)', async () => {
    const task = makeTask({
      uid: `etag-delete-${Date.now()}`,
      title: 'Will be modified before delete',
      accountId: 'etag-acct',
      calendarId: testCalendar.id,
    });

    const created = await createTask(conn(), testCalendar, task);
    expect(created).not.toBeNull();

    const updated = await updateTask(conn(), {
      ...task,
      title: 'Modified',
      href: created!.href,
      etag: created!.etag,
    } as Task);
    expect(updated).not.toBeNull();

    const staleDelete = await deleteTask(conn(), {
      ...task,
      href: created!.href,
      etag: created!.etag,
    } as Task);
    expect(staleDelete).toBe(false);

    const realDelete = await deleteTask(conn(), {
      ...task,
      href: created!.href,
      etag: updated!.etag,
    } as Task);
    expect(realDelete).toBe(true);
  }, 30_000);
});
