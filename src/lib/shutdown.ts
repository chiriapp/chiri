import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { settingsStore } from '$context/settingsContext';
import { loggers } from '$lib/logger';
import { flushTaskSnoozes } from '$lib/notifications/snoozes';

let quitting = false;

export const flushLocalState = async () => {
  await Promise.all([settingsStore.flush(), flushTaskSnoozes()]);
};

export const initializeShutdownHandler = () =>
  listen('app:flush-and-quit-requested', async () => {
    if (quitting) return;
    quitting = true;

    const results = await Promise.allSettled([flushLocalState()]);
    for (const result of results) {
      if (result.status === 'rejected') {
        loggers.main.error('Failed to flush local state before quitting:', result.reason);
      }
    }

    await invoke('force_quit');
  });
