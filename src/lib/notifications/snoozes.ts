import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { db } from '$lib/database';
import { loggers } from '$lib/logger';

export const LEGACY_SNOOZE_STORAGE_KEY = 'chiri:snoozedTasks';
const MAX_TIMEOUT_MS = 2_147_483_647;

type Listener = () => void;
type LegacyStorage = Pick<Storage, 'getItem' | 'removeItem'>;

interface SnoozeDatabase {
  getTaskSnoozes(now?: number): Promise<Array<[string, number]>>;
  setTaskSnooze(taskId: string, snoozedUntil: number): Promise<unknown>;
  clearTaskSnooze(taskId: string): Promise<unknown>;
  hasImportedLegacyTaskSnoozes(): Promise<boolean>;
  importLegacyTaskSnoozes(snoozes: Array<[string, number]>): Promise<unknown>;
}

interface TaskSnoozeStatus {
  isSnoozed: boolean;
  justUnsnoozed: boolean;
  until?: number;
}

const getLegacyStorage = (): LegacyStorage | undefined => {
  try {
    return globalThis.localStorage;
  } catch (error) {
    loggers.notifications.warn('localStorage is unavailable; skipping legacy snoozes:', error);
    return undefined;
  }
};

const readLegacySnoozes = (
  storage: LegacyStorage | undefined,
  now: number,
): Array<[string, number]> => {
  if (!storage) return [];

  try {
    const stored = storage.getItem(LEGACY_SNOOZE_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    return Object.entries(parsed).filter(
      (entry): entry is [string, number] => Number.isFinite(entry[1]) && entry[1] > now,
    );
  } catch (error) {
    loggers.notifications.warn('Failed to read legacy task snoozes:', error);
    return [];
  }
};

export class TaskSnoozeStore {
  private snoozedTasks = new Map<string, number>();
  private readonly listeners = new Set<Listener>();
  private initializationPromise: Promise<void> | null = null;
  private readonly pendingWrites: Array<() => Promise<unknown>> = [];
  private writePromise: Promise<void> | null = null;

  constructor(
    private readonly database: SnoozeDatabase = db,
    private readonly legacyStorage?: LegacyStorage,
  ) {}

  initialize(now: number = Date.now()) {
    this.initializationPromise ??= (async () => {
      let storedSnoozes = await this.database.getTaskSnoozes(now);
      const storage = this.legacyStorage ?? getLegacyStorage();

      if (!(await this.database.hasImportedLegacyTaskSnoozes())) {
        const legacySnoozes = readLegacySnoozes(storage, now);
        await this.database.importLegacyTaskSnoozes(legacySnoozes);
        storedSnoozes = await this.database.getTaskSnoozes(now);
      }

      try {
        storage?.removeItem(LEGACY_SNOOZE_STORAGE_KEY);
      } catch (error) {
        loggers.notifications.warn('Could not remove legacy task snoozes:', error);
      }

      this.snoozedTasks = new Map(storedSnoozes);
      this.notify();
    })();

    return this.initializationPromise;
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnoozes = () => new Map(this.snoozedTasks);

  getSnoozedUntil = (taskId: string) => {
    const until = this.snoozedTasks.get(taskId);
    return until !== undefined && until > Date.now() ? until : undefined;
  };

  clear = (taskId: string) => {
    if (!this.snoozedTasks.has(taskId)) return;

    this.snoozedTasks = new Map(this.snoozedTasks);
    this.snoozedTasks.delete(taskId);
    this.enqueue(() => this.database.clearTaskSnooze(taskId));
    this.notify();
  };

  snoozeUntil = (taskId: string, until: number) => {
    if (until <= Date.now()) {
      this.clear(taskId);
      return until;
    }

    this.snoozedTasks = new Map(this.snoozedTasks);
    this.snoozedTasks.set(taskId, until);
    this.enqueue(() => this.database.setTaskSnooze(taskId, until));
    this.notify();
    return until;
  };

  getStatus = (taskId: string, now: number = Date.now()): TaskSnoozeStatus => {
    const until = this.snoozedTasks.get(taskId);
    if (!until) return { isSnoozed: false, justUnsnoozed: false };

    if (now < until) return { isSnoozed: true, justUnsnoozed: false, until };

    this.clear(taskId);
    return { isSnoozed: false, justUnsnoozed: true };
  };

  async flush() {
    while (this.pendingWrites.length > 0 || this.writePromise) await this.drain();
  }

  private enqueue(write: () => Promise<unknown>) {
    this.pendingWrites.push(write);
    void this.drain().catch((error) => {
      loggers.notifications.error('Failed to persist task snooze:', error);
    });
  }

  private async drain(): Promise<void> {
    if (this.writePromise) return this.writePromise;

    this.writePromise = (async () => {
      while (this.pendingWrites.length > 0) {
        await this.pendingWrites[0]?.();
        this.pendingWrites.shift();
      }
    })().finally(() => {
      this.writePromise = null;
    });

    return this.writePromise;
  }

  private notify() {
    for (const listener of this.listeners) listener();
  }
}

const taskSnoozeStore = new TaskSnoozeStore();

export const initializeTaskSnoozes = (now?: number) => taskSnoozeStore.initialize(now);
export const flushTaskSnoozes = () => taskSnoozeStore.flush();
export const subscribeToSnoozes = taskSnoozeStore.subscribe;
export const getSnoozes = taskSnoozeStore.getSnoozes;
export const getSnoozedUntil = taskSnoozeStore.getSnoozedUntil;
export const clearTaskSnooze = taskSnoozeStore.clear;
export const snoozeTaskUntil = taskSnoozeStore.snoozeUntil;
export const getTaskSnoozeStatus = taskSnoozeStore.getStatus;

export const snoozeTaskFor = (taskId: string, durationMinutes: number) =>
  snoozeTaskUntil(taskId, Date.now() + durationMinutes * 60_000);

export const useTaskSnooze = (taskId: string) => {
  const until = useSyncExternalStore(
    subscribeToSnoozes,
    () => getSnoozedUntil(taskId),
    () => undefined,
  );

  useEffect(() => {
    if (!until) return;

    let timeoutId: number | undefined;
    const scheduleExpiry = () => {
      const currentUntil = getSnoozes().get(taskId);
      if (!currentUntil) return;

      const delay = currentUntil - Date.now();
      if (delay <= 0) {
        taskSnoozeStore.getStatus(taskId);
        return;
      }
      timeoutId = window.setTimeout(scheduleExpiry, Math.min(delay, MAX_TIMEOUT_MS));
    };

    scheduleExpiry();
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [taskId, until]);

  const clear = useCallback(() => clearTaskSnooze(taskId), [taskId]);
  return { until, isSnoozed: until !== undefined, clear };
};
