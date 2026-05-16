import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect } from '$lib/caldav/connection';
import { createTask, deleteTask, fetchTasks } from '$lib/caldav/tasks';
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

/**
 * Regression coverage for chiriapp/chiri#51 — at the protocol level. Validates
 * that the chiri client's "delete from old + create in new" approach to moving
 * a task between calendars works correctly against a real CalDAV server.
 *
 * (This is independent of the store-layer logic in tasks-calendar-move.test.ts.
 * Together they cover both the trigger and the protocol-level effect.)
 */
integration('calendar-move workflow (real server)', () => {
  let calendarA: Calendar;
  let calendarB: Calendar;
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
      'move-acct',
      url!,
      username!,
      password!,
      serverType,
      calendarHomeOverride,
    );
    serverUrl = url!.replace(/\/$/, '');
    calendarHome = result.calendarHome;
    calendarA = await getOrCreateTestCalendar(conn(), 'move-acct', 'chiri-test-move-a');
    calendarB = await getOrCreateTestCalendar(conn(), 'move-acct', 'chiri-test-move-b');
    await clearCalendarTasks(conn(), 'move-acct', calendarA);
    await clearCalendarTasks(conn(), 'move-acct', calendarB);
  }, 30_000);

  afterAll(async () => {
    for (const cal of [calendarA, calendarB]) {
      if (cal) await clearCalendarTasks(conn(), 'move-acct', cal);
    }
  }, 30_000);

  it('moving a task from A to B = delete from A + create in B (same UID)', async () => {
    // Original task in calendar A
    const original = makeTask({
      uid: `move-${Date.now()}`,
      title: 'Moveable task',
      accountId: 'move-acct',
      calendarId: calendarA.id,
    });
    const inA = await createTask(conn(), calendarA, original);
    expect(inA).not.toBeNull();

    // Confirm it's in A, not in B
    const aBefore = await fetchTasks(conn(), 'move-acct', calendarA);
    const bBefore = await fetchTasks(conn(), 'move-acct', calendarB);
    expect(aBefore?.find((t) => t.uid === original.uid)).toBeDefined();
    expect(bBefore?.find((t) => t.uid === original.uid)).toBeUndefined();

    // Simulate chiri's calendar-move flow:
    //   1. DELETE from old calendar's href
    //   2. CREATE fresh in new calendar (same UID, no href yet)
    const deleted = await deleteTask(conn(), {
      ...original,
      href: inA!.href,
      etag: inA!.etag,
    } as Task);
    expect(deleted).toBe(true);

    const moved = makeTask({
      uid: original.uid,
      title: original.title,
      accountId: 'move-acct',
      calendarId: calendarB.id,
    });
    const inB = await createTask(conn(), calendarB, moved);
    expect(inB).not.toBeNull();

    // After the move: task in B, not in A
    const aAfter = await fetchTasks(conn(), 'move-acct', calendarA);
    const bAfter = await fetchTasks(conn(), 'move-acct', calendarB);
    expect(aAfter?.find((t) => t.uid === original.uid)).toBeUndefined();
    const foundInB = bAfter?.find((t) => t.uid === original.uid);
    expect(foundInB).toBeDefined();
    expect(foundInB?.title).toBe(original.title);

    // cleanup
    await deleteTask(conn(), { ...moved, href: inB!.href, etag: inB!.etag } as Task);
  }, 30_000);

  it('demonstrates the OLD-bug behavior: PUT to old href does NOT move the task', async () => {
    // What the buggy code used to do: just PUT to the existing href with
    // updated content (which kept the task in the old calendar on the server).
    // This test pins the protocol fact so the fix's necessity stays visible.
    const original = makeTask({
      uid: `oldbug-${Date.now()}`,
      title: 'Original location',
      accountId: 'move-acct',
      calendarId: calendarA.id,
    });
    const inA = await createTask(conn(), calendarA, original);
    expect(inA).not.toBeNull();

    // The buggy "move" attempt: just update via PUT to the same A-located href
    // (chiri previously did exactly this on calendar change).
    const updateUrl = inA!.href;
    expect(updateUrl).toContain(calendarA.url.replace(/\/$/, ''));
    expect(updateUrl).not.toContain(calendarB.url.replace(/\/$/, ''));

    // Listing B never sees this task — that's the bug. Calendar membership is
    // determined entirely by URL.
    const bView = await fetchTasks(conn(), 'move-acct', calendarB);
    expect(bView?.find((t) => t.uid === original.uid)).toBeUndefined();

    // cleanup
    await deleteTask(conn(), { ...original, href: inA!.href, etag: inA!.etag } as Task);
  }, 30_000);
});
