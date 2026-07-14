import type { UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow, PhysicalPosition, PhysicalSize } from '@tauri-apps/api/window';
import { settingsStore } from '$context/settingsContext';
import { loggers } from '$lib/logger';

const log = loggers.app.child('WindowState');
const STORAGE_KEY = 'chiri-window-state';

interface StoredWindowState {
  width: number;
  height: number;
  x: number;
  y: number;
}

const isUsableWindowState = (state: unknown): state is StoredWindowState => {
  if (!state || typeof state !== 'object') return false;
  const candidate = state as Partial<StoredWindowState>;
  return (
    typeof candidate.width === 'number' &&
    candidate.width >= 320 &&
    typeof candidate.height === 'number' &&
    candidate.height >= 240 &&
    typeof candidate.x === 'number' &&
    typeof candidate.y === 'number'
  );
};

const readStoredWindowState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return isUsableWindowState(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeStoredWindowState = (state: StoredWindowState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const readCurrentWindowState = async (): Promise<StoredWindowState> => {
  const appWindow = getCurrentWindow();
  const [size, position] = await Promise.all([appWindow.innerSize(), appWindow.outerPosition()]);
  return {
    width: size.width,
    height: size.height,
    x: position.x,
    y: position.y,
  };
};

export const restoreWindowState = async () => {
  if (!settingsStore.getState().restoreWindowState) return;

  const state = readStoredWindowState();
  if (!state) return;

  const appWindow = getCurrentWindow();
  try {
    await appWindow.setSize(new PhysicalSize(state.width, state.height));
    await appWindow.setPosition(new PhysicalPosition(state.x, state.y));
  } catch (error) {
    log.warn('Failed to restore window state:', error);
  }
};

export const watchWindowState = async () => {
  const appWindow = getCurrentWindow();
  let saveTimer: number | null = null;
  const unlisteners: UnlistenFn[] = [];

  const scheduleSave = () => {
    if (!settingsStore.getState().restoreWindowState) return;
    if (saveTimer !== null) window.clearTimeout(saveTimer);

    saveTimer = window.setTimeout(() => {
      saveTimer = null;
      readCurrentWindowState()
        .then(writeStoredWindowState)
        .catch((error) => log.warn('Failed to save window state:', error));
    }, 250);
  };

  unlisteners.push(await appWindow.onResized(scheduleSave));
  unlisteners.push(await appWindow.onMoved(scheduleSave));

  return () => {
    if (saveTimer !== null) window.clearTimeout(saveTimer);
    for (const unlisten of unlisteners) unlisten();
  };
};
