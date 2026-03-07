import { createContext } from 'react';

interface SyncState {
  syncingCalendarId: string | null;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  lastSyncError: string | null;
}

interface SyncActions {
  setSyncingCalendarId: (id: string | null) => void;
  setIsSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: Date | null) => void;
  setLastSyncError: (error: string | null) => void;
  registerInitialSyncCallback: (callback: () => void) => void;
}

export type SyncStore = SyncState & SyncActions;

// Context for React components
export const SyncContext = createContext<SyncStore | null>(null);
