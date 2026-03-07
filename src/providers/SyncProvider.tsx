import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { settingsStore } from '$context/settingsContext';
import { SyncContext, type SyncStore } from '$context/syncContext';
import { loggers } from '$lib/logger';
import { getAllAccounts } from '$lib/store/accounts';

const log = loggers.sync;

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const [syncingCalendarId, setSyncingCalendarIdState] = useState<string | null>(null);
  const [isSyncing, setIsSyncingState] = useState(false);
  const [lastSyncTime, setLastSyncTimeState] = useState<Date | null>(null);
  const [lastSyncError, setLastSyncErrorState] = useState<string | null>(null);
  const initialSyncCallbackRef = useRef<(() => void) | null>(null);
  const initialSyncTriggeredRef = useRef(false);

  const setSyncingCalendarId = useCallback((id: string | null) => {
    setSyncingCalendarIdState(id);
  }, []);

  const setIsSyncing = useCallback((syncing: boolean) => {
    setIsSyncingState(syncing);
  }, []);

  const setLastSyncTime = useCallback((time: Date | null) => {
    setLastSyncTimeState(time);
  }, []);

  const setLastSyncError = useCallback((error: string | null) => {
    setLastSyncErrorState(error);
  }, []);

  const registerInitialSyncCallback = useCallback((callback: () => void) => {
    initialSyncCallbackRef.current = callback;
  }, []);

  // Trigger initial sync once when callback is registered
  useEffect(() => {
    if (initialSyncTriggeredRef.current || !initialSyncCallbackRef.current) {
      return;
    }

    const accounts = getAllAccounts();
    const syncOnStartup = settingsStore.getState().syncOnStartup;

    if (accounts.length === 0) {
      log.debug('Initial sync skipped - no accounts configured');
      return;
    }

    if (!syncOnStartup) {
      log.debug('Initial sync skipped - sync on startup disabled in settings');
      return;
    }

    initialSyncTriggeredRef.current = true;

    // Wait for React to finish render cycle and browser to paint
    requestAnimationFrame(() => {
      setTimeout(() => {
        log.debug('Initial sync starting after render cycle complete...');
        initialSyncCallbackRef.current?.();
      }, 0);
    });
  });

  const value: SyncStore = {
    syncingCalendarId,
    isSyncing,
    lastSyncTime,
    lastSyncError,
    setSyncingCalendarId,
    setIsSyncing,
    setLastSyncTime,
    setLastSyncError,
    registerInitialSyncCallback,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};
