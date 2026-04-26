import { useSyncExternalStore } from 'react';

const SNOOZE_STORAGE_KEY = 'chiri:snoozedTasks';

type Listener = () => void;

const listeners = new Set<Listener>();

const loadFromStorage = (): Map<string, number> => {
  try {
    const stored = localStorage.getItem(SNOOZE_STORAGE_KEY);
    if (!stored) return new Map();
    const obj = JSON.parse(stored) as Record<string, number>;
    const now = Date.now();
    return new Map(Object.entries(obj).filter(([, until]) => until > now));
  } catch {
    return new Map();
  }
};

let snoozedTasks: Map<string, number> = loadFromStorage();

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

const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getSnoozedTasks = () => {
  return snoozedTasks;
};

export const setSnoozed = (taskId: string, until: number) => {
  snoozedTasks = new Map(snoozedTasks);
  snoozedTasks.set(taskId, until);
  saveToStorage();
  notify();
};

export const clearSnoozed = (taskId: string) => {
  snoozedTasks = new Map(snoozedTasks);
  snoozedTasks.delete(taskId);
  saveToStorage();
  notify();
};

/** Returns the snooze-until timestamp for a single task. Only re-renders when that task's value changes. */
export const useSnoozedUntil = (taskId: string): number | undefined => {
  return useSyncExternalStore(subscribe, () => snoozedTasks.get(taskId));
};
