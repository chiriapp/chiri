import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account } from '$types/account';
import { makeAccount } from '../../fixtures';

const tauriMocks = vi.hoisted(() => {
  const handlers = new Map<string, () => void>();
  return {
    handlers,
    invoke: vi.fn((_command: string, _args?: Record<string, unknown>) => Promise.resolve()),
    listen: vi.fn((eventName: string, handler: () => void) => {
      handlers.set(eventName, handler);
      return Promise.resolve(() => handlers.delete(eventName));
    }),
  };
});

vi.mock('@tauri-apps/api/event', () => ({
  listen: tauriMocks.listen,
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: tauriMocks.invoke,
}));

const settingsMocks = vi.hoisted(() => ({
  enableSystemTray: true,
  setSystemTrayAppliedValue: vi.fn(),
}));

vi.mock('$context/settingsContext', () => ({
  useSettingsStore: () => ({
    enableSystemTray: settingsMocks.enableSystemTray,
    setSystemTrayAppliedValue: settingsMocks.setSystemTrayAppliedValue,
    timeFormat: '24h',
  }),
}));

const accountMocks = vi.hoisted(() => ({ accounts: [] as Account[] }));

vi.mock('$hooks/queries/useAccounts', () => ({
  useAccounts: () => ({ data: accountMocks.accounts }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

import { useTray } from '$hooks/system/useTray';

const caldavAccount = makeAccount({
  id: 'acct-1',
  caldav: {
    serverUrl: 'https://cal.example.com',
    username: 'user',
    password: 'pass',
    serverType: 'generic',
    authType: 'basic',
  },
});
const localAccount = makeAccount({ id: 'acct-2' });

const onSyncRequest = vi.fn();
const onOpenSettings = vi.fn();
const onAddAccount = vi.fn();

const Harness = () => {
  useTray({
    isSyncing: false,
    lastSyncTime: null,
    onSyncRequest,
    onOpenSettings,
    onAddAccount,
  });

  return null;
};

describe('useTray', () => {
  let container: HTMLDivElement;
  let root: Root;

  const renderHarness = async () => {
    await act(async () => {
      root.render(createElement(Harness));
    });
  };

  const invokedWith = (command: string) =>
    tauriMocks.invoke.mock.calls.filter(([name]) => name === command).pop()?.[1];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    tauriMocks.invoke.mockClear();
    tauriMocks.listen.mockClear();
    tauriMocks.handlers.clear();
    accountMocks.accounts = [];
    onSyncRequest.mockClear();
    onOpenSettings.mockClear();
    onAddAccount.mockClear();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('labels the sync entry as account setup while nothing can sync', async () => {
    await renderHarness();

    expect(invokedWith('update_tray_accounts')).toEqual({ hasCaldavAccount: false });
    expect(invokedWith('update_tray_sync_time')).toEqual({
      timeStr: 'No accounts to sync',
    });
  });

  it('labels the sync entry as a sync once a CalDAV account exists', async () => {
    accountMocks.accounts = [localAccount, caldavAccount];
    await renderHarness();

    expect(invokedWith('update_tray_accounts')).toEqual({ hasCaldavAccount: true });
    expect(invokedWith('update_tray_sync_time')).toEqual({ timeStr: 'Last sync: Never' });
  });

  it('routes each tray event to its own action', async () => {
    await renderHarness();

    act(() => tauriMocks.handlers.get('tray-add-account')?.());
    expect(onAddAccount).toHaveBeenCalledTimes(1);
    act(() => tauriMocks.handlers.get('tray-settings')?.());
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    act(() => tauriMocks.handlers.get('tray-sync')?.());
    expect(onSyncRequest).toHaveBeenCalledTimes(1);
  });
});
