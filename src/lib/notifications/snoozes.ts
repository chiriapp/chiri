import { useCallback, useEffect, useSyncExternalStore } from 'react';

const SNOOZE_STORAGE_KEY = 'chiri:snoozedTasks';
const MAX_TIMEOUT_MS = 2_147_483_647;

type Listener = () => void;

export interface TaskSnoozeStatus {
  isSnoozed: boolean;
  justUnsnoozed: boolean;
  until?: number;
}

const listeners = new Set<Listener>();

const loadFromStorage = (): Map<string, number> => {
  try {
    const stored = localStorage.getItem(SNOOZE_STORAGE_KEY);
    if (!stored) return new Map();

    const entries = Object.entries(JSON.parse(stored) as Record<string, number>);
    const now = Date.now();
    return new Map(entries.filter(([, until]) => Number.isFinite(until) && until > now));
  } catch {
    return new Map();
  }
};

let snoozedTasks = loadFromStorage();

const saveToStorage = () => {
  try {
    localStorage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(Object.fromEntries(snoozedTasks)));
  } catch {
    // ignore storage errors
  }
};

const notify = () => {
  for (const listener of listeners) listener();
};

export const subscribeToSnoozes = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getSnoozes = () => new Map(snoozedTasks);

const getStoredSnoozedUntil = (taskId: string) => snoozedTasks.get(taskId);

export const getSnoozedUntil = (taskId: string) => {
  const until = getStoredSnoozedUntil(taskId);
  return until !== undefined && until > Date.now() ? until : undefined;
};

export const clearTaskSnooze = (taskId: string) => {
  if (!snoozedTasks.has(taskId)) return;

  snoozedTasks = new Map(snoozedTasks);
  snoozedTasks.delete(taskId);
  saveToStorage();
  notify();
};

export const snoozeTaskUntil = (taskId: string, until: number) => {
  if (until <= Date.now()) {
    clearTaskSnooze(taskId);
    return until;
  }

  snoozedTasks = new Map(snoozedTasks);
  snoozedTasks.set(taskId, until);
  saveToStorage();
  notify();
  return until;
};

export const snoozeTaskFor = (taskId: string, durationMinutes: number) => {
  return snoozeTaskUntil(taskId, Date.now() + durationMinutes * 60_000);
};

export const getTaskSnoozeStatus = (taskId: string, now: number = Date.now()): TaskSnoozeStatus => {
  const until = snoozedTasks.get(taskId);
  if (!until) return { isSnoozed: false, justUnsnoozed: false };

  if (now < until) {
    return { isSnoozed: true, justUnsnoozed: false, until };
  }

  clearTaskSnooze(taskId);
  return { isSnoozed: false, justUnsnoozed: true };
};

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
      const currentUntil = getStoredSnoozedUntil(taskId);
      if (!currentUntil) return;

      const delay = currentUntil - Date.now();
      if (delay <= 0) {
        notify();
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

  return {
    until,
    isSnoozed: until !== undefined,
    clear,
  };
};
