import { createContext, useContext } from 'react';

interface SyncProgress {
  current: number;
  total: number;
}

interface SyncState {
  syncingCalendarId: string | null;
  syncProgress: SyncProgress | null;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  lastSyncSource: string | null;
  lastSyncError: string | null;
}

interface SyncActions {
  setSyncingCalendarId: (id: string | null) => void;
  setSyncProgress: (progress: SyncProgress | null) => void;
  setIsSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: Date | null) => void;
  setLastSyncSource: (source: string | null) => void;
  setLastSyncError: (error: string | null) => void;
  registerInitialSyncCallback: (callback: () => void) => void;
}

export type SyncStore = SyncState & SyncActions;

// context for React components
export const SyncContext = createContext<SyncStore | null>(null);

export const useSyncStore = (): SyncStore => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncStore must be used within a SyncProvider');
  }
  return context;
};
