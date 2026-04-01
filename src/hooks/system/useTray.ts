import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useSettingsStore } from '$hooks/store/useSettingsStore';

interface UseTrayOptions {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  onSyncRequest: () => void;
}

export const useTray = ({ isSyncing, lastSyncTime, onSyncRequest }: UseTrayOptions) => {
  const { data: accounts = [] } = useAccounts();
  const { enableSystemTray } = useSettingsStore();

  useEffect(() => {
    invoke('set_tray_visible', { visible: enableSystemTray }).catch((err) => {
      console.error('Failed to set tray visibility:', err);
    });
  }, [enableSystemTray]);

  useEffect(() => {
    const unlisten = listen('tray-sync', () => {
      onSyncRequest();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [onSyncRequest]);

  useEffect(() => {
    if (isSyncing) {
      invoke('update_tray_sync_time', { timeStr: 'Last sync: Syncing...' }).catch((err) => {
        console.error('Failed to update sync status:', err);
      });
    } else if (lastSyncTime) {
      const timeStr = lastSyncTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      invoke('update_tray_sync_time', { timeStr: `Last sync: ${timeStr}` }).catch((err) => {
        console.error('Failed to update sync time:', err);
      });
    }
  }, [isSyncing, lastSyncTime]);

  useEffect(() => {
    invoke('update_tray_sync_enabled', { enabled: accounts.length > 0 }).catch((err) => {
      console.error('Failed to update sync button state:', err);
    });
  }, [accounts.length]);
};
