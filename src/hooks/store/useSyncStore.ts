import { useContext } from 'react';
import { SyncContext, type SyncStore } from '$context/syncContext';

export const useSyncStore = (): SyncStore => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncStore must be used within a SyncProvider');
  }
  return context;
};
