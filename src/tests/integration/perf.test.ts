import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect } from '$lib/caldav/connection';
import { createTask, deleteTask, fetchTasks, syncCalendar, updateTask } from '$lib/caldav/tasks';
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

// scale via CHIRI_TEST_PERF_TASKS. default 50 is large enough to be informative,
// small enough to keep round-trip suites under ~30s on local servers
const N = Number.parseInt(process.env.CHIRI_TEST_PERF_TASKS ?? '50', 10);

const fmt = (ms: number) => `${ms.toFixed(0)}ms`;
const rate = (count: number, ms: number) => `${((count * 1000) / ms).toFixed(1)} ops/s`;

integration(`perf smoke (real server, N=${N})`, () => {
  let testCalendar: Calendar;
  let serverUrl: string;
  let calendarHome: string;
  let createdTasks: { task: Task; href: string; etag: string }[] = [];

  const conn = () => ({
    serverUrl,
    credentials,
    principalUrl: calendarHome,
    calendarHome,
    serverType,
  });

  beforeAll(async () => {
    const result = await connect(
      'perf-acct',
      url!,
      username!,
      password!,
      serverType,
      calendarHomeOverride,
    );
    serverUrl = url!.replace(/\/$/, '');
    calendarHome = result.calendarHome;
    testCalendar = await getOrCreateTestCalendar(conn(), 'perf-acct', 'chiri-test-perf');
    await clearCalendarTasks(conn(), 'perf-acct', testCalendar);
  }, 60_000);

  afterAll(async () => {
    if (testCalendar) await clearCalendarTasks(conn(), 'perf-acct', testCalendar);
  }, 60_000);

  it(`bulk create ${N} tasks`, async () => {
    const tasks = Array.from({ length: N }, (_, i) =>
      makeTask({
        uid: `perf-${Date.now()}-${i}`,
        title: `Perf task ${i}`,
        description: 'created by perf smoke',
        accountId: 'perf-acct',
        calendarId: testCalendar.id,
      }),
    );

    // Serial — Promise.all triggers concurrent-write rejections on Radicale
    // (multifilesystem storage) and Xandikos (dulwich/git 423 Locked). Serial
    // also matches how chiri's real sync pushes tasks.
    const start = performance.now();
    const results: Array<{ href: string; etag: string } | null> = [];
    for (const t of tasks) {
      results.push(await createTask(conn(), testCalendar, t));
    }
    const elapsed = performance.now() - start;

    const successful = results.filter((r) => r !== null);
    expect(successful).toHaveLength(N);

    // stash for later tests (deletion at the end)
    createdTasks = tasks.map((task, i) => ({
      task,
      href: results[i]!.href,
      etag: results[i]!.etag,
    }));

    console.log(`  → bulk create: ${fmt(elapsed)} (${rate(N, elapsed)})`);
  }, 120_000);

  it(`fetchTasks returns all ${N} tasks`, async () => {
    const start = performance.now();
    const fetched = await fetchTasks(conn(), 'perf-acct', testCalendar);
    const elapsed = performance.now() - start;

    expect(fetched).not.toBeNull();
    expect(fetched).toHaveLength(N);

    console.log(`  → fetchTasks: ${fmt(elapsed)} (${rate(N, elapsed)} per task)`);
  }, 60_000);

  it(`syncCalendar no-op (all etags match) over ${N} tasks`, async () => {
    const localTasks: Task[] = createdTasks.map((c) => ({
      ...c.task,
      href: c.href,
      etag: c.etag,
      synced: true,
    }));

    const start = performance.now();
    const result = await syncCalendar(conn(), 'perf-acct', testCalendar, localTasks);
    const elapsed = performance.now() - start;

    expect(result).not.toBeNull();
    expect(result!.created).toEqual([]);
    expect(result!.updated).toEqual([]);
    expect(result!.deleted).toEqual([]);

    console.log(`  → syncCalendar (no-op): ${fmt(elapsed)} (${rate(N, elapsed)} per task)`);
  }, 60_000);

  it(`syncCalendar with 20% divergence over ${N} tasks`, async () => {
    // server-side modify ~20% of tasks. sequential, not Promise.all. xandikos
    // returns 423 Locked when writes to the same collection collide. serializing
    // also matches how chiri's real sync layer pushes changes
    const toModify = Math.floor(N * 0.2);
    const modifyStart = performance.now();
    for (const c of createdTasks.slice(0, toModify)) {
      await updateTask(conn(), {
        ...c.task,
        title: `${c.task.title} (modified)`,
        href: c.href,
        etag: c.etag,
      } as Task);
    }
    console.log(`  → server-side modify ${toModify}: ${fmt(performance.now() - modifyStart)}`);

    // now sync with stale local etags for the modified ones
    const localTasks: Task[] = createdTasks.map((c) => ({
      ...c.task,
      href: c.href,
      etag: c.etag, // stale for the first `toModify`
      synced: true,
    }));

    const start = performance.now();
    const result = await syncCalendar(conn(), 'perf-acct', testCalendar, localTasks);
    const elapsed = performance.now() - start;

    expect(result).not.toBeNull();
    expect(result!.updated).toHaveLength(toModify);
    expect(result!.created).toEqual([]);
    expect(result!.deleted).toEqual([]);

    console.log(
      `  → syncCalendar (${toModify} updated): ${fmt(elapsed)} (${rate(N, elapsed)} per scanned task)`,
    );
  }, 120_000);

  it(`bulk delete ${N} tasks`, async () => {
    // pull current etags first so we don't 412 on stale-etag servers that DO enforce
    const fetched = await fetchTasks(conn(), 'perf-acct', testCalendar);
    expect(fetched).toHaveLength(N);

    // Serial for the same reasons as bulk_create — keeps results consistent
    // across server backends regardless of their concurrency tolerance.
    const start = performance.now();
    const results: boolean[] = [];
    for (const t of fetched!) {
      results.push(await deleteTask(conn(), t));
    }
    const elapsed = performance.now() - start;

    expect(results.filter(Boolean)).toHaveLength(N);

    console.log(`  → bulk delete: ${fmt(elapsed)} (${rate(N, elapsed)})`);
  }, 120_000);
});
