import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fetchCalendars } from '$lib/caldav/calendars';
import { connect } from '$lib/caldav/connection';
import { createTask, deleteTask, fetchTasks, updateTask } from '$lib/caldav/tasks';
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

const TEST_CALENDAR_NAME = 'chiri-test-smoke';

integration('CalDAV integration smoke (real server)', () => {
  let calendarHome: string;
  let serverUrl: string;
  let testCalendar: Calendar;

  const conn = () => ({
    serverUrl,
    credentials,
    principalUrl: calendarHome,
    calendarHome,
    serverType,
  });

  beforeAll(async () => {
    const result = await connect(
      'test-acct',
      url!,
      username!,
      password!,
      serverType,
      calendarHomeOverride,
    );
    calendarHome = result.calendarHome;
    serverUrl = url!.replace(/\/$/, '');
    expect(calendarHome).toMatch(/^https?:/);

    testCalendar = await getOrCreateTestCalendar(conn(), 'test-acct', TEST_CALENDAR_NAME);
    await clearCalendarTasks(conn(), 'test-acct', testCalendar);
  }, 30_000);

  afterAll(async () => {
    if (testCalendar) await clearCalendarTasks(conn(), 'test-acct', testCalendar);
  }, 30_000);

  it('fetchCalendars sees the test calendar', async () => {
    const calendars = await fetchCalendars(conn(), 'test-acct');
    expect(calendars.find((c) => c.url === testCalendar.url)).toBeDefined();
  }, 30_000);

  it('createTask → fetchTasks → updateTask → deleteTask round-trip', async () => {
    const task = makeTask({
      uid: `task-${Date.now()}`,
      title: 'Integration test task',
      description: 'Created by the smoke test',
      priority: 'medium',
      accountId: 'test-acct',
      calendarId: testCalendar.id,
    });

    // CREATE
    const created = await createTask(conn(), testCalendar, task);
    expect(created).not.toBeNull();
    expect(created?.href).toBeTruthy();
    expect(created?.etag).toBeTruthy();

    // FETCH
    const fetched = await fetchTasks(conn(), 'test-acct', testCalendar);
    expect(fetched).not.toBeNull();
    const found = fetched?.find((t) => t.uid === task.uid);
    expect(found?.title).toBe('Integration test task');
    expect(found?.priority).toBe('medium');

    // UPDATE
    const updated = await updateTask(conn(), {
      ...task,
      title: 'Updated title',
      href: created!.href,
      etag: created!.etag,
    } as Task);
    expect(updated).not.toBeNull();
    expect(updated?.etag).toBeTruthy();
    expect(updated?.etag).not.toBe(created?.etag);

    // DELETE
    const deleted = await deleteTask(conn(), {
      ...task,
      href: created!.href,
      etag: updated!.etag,
    } as Task);
    expect(deleted).toBe(true);

    const afterDelete = await fetchTasks(conn(), 'test-acct', testCalendar);
    expect(afterDelete?.find((t) => t.uid === task.uid)).toBeUndefined();
  }, 30_000);

  it('409/412 recovery: re-creating with same UID returns href+etag from PROPFIND', async () => {
    const task = makeTask({
      uid: `conflict-${Date.now()}`,
      title: 'Conflict test',
      accountId: 'test-acct',
      calendarId: testCalendar.id,
    });

    const first = await createTask(conn(), testCalendar, task);
    expect(first).not.toBeNull();

    // Second create with same UID — Nextcloud returns 412, Rustical/Radicale return 409.
    // Either way, chiri's recovery branch should return href+etag.
    const second = await createTask(conn(), testCalendar, task);
    expect(second).not.toBeNull();
    expect(second?.href).toBe(first?.href);
    expect(second?.etag).toBeTruthy();

    await deleteTask(conn(), { ...task, href: first!.href, etag: second!.etag } as Task);
  }, 30_000);
});
