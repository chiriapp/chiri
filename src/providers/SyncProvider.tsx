import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { settingsStore } from '$context/settingsContext';
import { SyncContext, type SyncStore } from '$context/syncContext';
import { loggers } from '$lib/logger';
import { getAllAccounts } from '$lib/store/accounts';

const log = loggers.sync;

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const [syncingCalendarId, setSyncingCalendarIdState] = useState<string | null>(null);
  const [syncProgress, setSyncProgressState] = useState<{ current: number; total: number } | null>(
    null,
  );
  const [isSyncing, setIsSyncingState] = useState(false);
  const [lastSyncTime, setLastSyncTimeState] = useState<Date | null>(null);
  const [lastSyncSource, setLastSyncSourceState] = useState<string | null>(null);
  const [lastSyncError, setLastSyncErrorState] = useState<string | null>(null);
  const initialSyncCallbackRef = useRef<(() => void) | null>(null);
  const syncRequestCallbackRef = useRef<(() => void) | null>(null);
  const initialSyncTriggeredRef = useRef(false);

  const setSyncingCalendarId = useCallback((id: string | null) => {
    setSyncingCalendarIdState(id);
  }, []);

  const setSyncProgress = useCallback((progress: { current: number; total: number } | null) => {
    setSyncProgressState(progress);
  }, []);

  const setIsSyncing = useCallback((syncing: boolean) => {
    setIsSyncingState(syncing);
  }, []);

  const setLastSyncTime = useCallback((time: Date | null) => {
    setLastSyncTimeState(time);
  }, []);

  const setLastSyncSource = useCallback((source: string | null) => {
    setLastSyncSourceState(source);
  }, []);

  const setLastSyncError = useCallback((error: string | null) => {
    setLastSyncErrorState(error);
  }, []);

  const registerInitialSyncCallback = useCallback((callback: () => void) => {
    initialSyncCallbackRef.current = callback;
  }, []);

  const registerSyncRequestCallback = useCallback((callback: () => void) => {
    syncRequestCallbackRef.current = callback;
  }, []);

  const requestSync = useCallback(() => {
    syncRequestCallbackRef.current?.();
  }, []);

  // trigger initial sync once when callback is registered
  useEffect(() => {
    if (initialSyncTriggeredRef.current || !initialSyncCallbackRef.current) {
      return;
    }

    const accounts = getAllAccounts();
    const syncOnStartup = settingsStore.getState().syncOnStartup;

    if (!accounts.some((a) => a.caldav)) {
      log.debug('Initial sync skipped - no CalDAV accounts configured');
      return;
    }

    if (!syncOnStartup) {
      log.debug('Initial sync skipped - sync on startup disabled in settings');
      return;
    }

    initialSyncTriggeredRef.current = true;

    // wait for React to finish render cycle and browser to paint
    requestAnimationFrame(() => {
      setTimeout(() => {
        log.debug('Initial sync starting after render cycle complete...');
        initialSyncCallbackRef.current?.();
      }, 0);
    });
  });

  const value: SyncStore = {
    syncingCalendarId,
    syncProgress,
    isSyncing,
    lastSyncTime,
    lastSyncSource,
    lastSyncError,
    setSyncingCalendarId,
    setSyncProgress,
    setIsSyncing,
    setLastSyncTime,
    setLastSyncSource,
    setLastSyncError,
    registerInitialSyncCallback,
    registerSyncRequestCallback,
    requestSync,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};
