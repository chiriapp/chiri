import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { useSettingsStore } from '$context/settingsContext';
import { useAccounts } from '$hooks/queries/useAccounts';
import { formatTime } from '$utils/date';

interface UseTrayOptions {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  onSyncRequest: () => void;
  onOpenSettings: () => void;
  onAddAccount: () => void;
}

export const useTray = ({
  isSyncing,
  lastSyncTime,
  onSyncRequest,
  onOpenSettings,
  onAddAccount,
}: UseTrayOptions) => {
  const { data: accounts = [] } = useAccounts();
  const { enableSystemTray, setSystemTrayAppliedValue, timeFormat } = useSettingsStore();
  const hasCaldavAccount = accounts.some((account) => account.caldav);

  useEffect(() => {
    invoke('set_tray_visible', { visible: enableSystemTray })
      .then(() => {
        setSystemTrayAppliedValue(enableSystemTray);
      })
      .catch((err) => {
        console.error('Failed to set tray visibility:', err);
      });
  }, [enableSystemTray, setSystemTrayAppliedValue]);

  useEffect(() => {
    const listeners = [
      listen('tray-sync', () => {
        onSyncRequest();
      }),
      listen('tray-settings', () => {
        onOpenSettings();
      }),
      listen('tray-add-account', () => {
        onAddAccount();
      }),
    ];

    return () => {
      for (const listener of listeners) {
        listener.then((unlisten) => unlisten());
      }
    };
  }, [onAddAccount, onOpenSettings, onSyncRequest]);

  useEffect(() => {
    if (!enableSystemTray) return;

    const label = !hasCaldavAccount
      ? 'No accounts to sync'
      : isSyncing
        ? 'Last sync: Syncing...'
        : `Last sync: ${lastSyncTime ? formatTime(lastSyncTime, timeFormat) : 'Never'}`;

    invoke('update_tray_sync_time', { timeStr: label }).catch((err) => {
      console.error('Failed to update sync status:', err);
    });
  }, [enableSystemTray, hasCaldavAccount, isSyncing, lastSyncTime, timeFormat]);

  useEffect(() => {
    if (!enableSystemTray) return;

    invoke('update_tray_accounts', { hasCaldavAccount }).catch((err) => {
      console.error('Failed to update the tray sync entry:', err);
    });
  }, [enableSystemTray, hasCaldavAccount]);
};
