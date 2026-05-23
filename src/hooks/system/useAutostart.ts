import { invoke } from '@tauri-apps/api/core';
import {
  disable as disableAutostart,
  enable as enableAutostart,
  isEnabled as isAutostartEnabled,
} from '@tauri-apps/plugin-autostart';
import { useCallback, useEffect, useState } from 'react';
import { isMacPlatform } from '$utils/platform';

type MacLaunchAtLoginStatus =
  | 'enabled'
  | 'disabled'
  | 'requires_approval'
  | 'not_found'
  | 'unsupported';

type AutostartState = {
  enabled: boolean;
  error: string | null;
};

let cachedAutostartState: AutostartState | null = null;

const getMacAutostartState = (status: MacLaunchAtLoginStatus): AutostartState => ({
  enabled: status === 'enabled' || status === 'requires_approval',
  error:
    status === 'requires_approval'
      ? 'Approve Chiri in macOS Login Items & Extensions to finish enabling launch at login.'
      : status === 'unsupported'
        ? 'Could not read launch-at-login status.'
        : null,
});

const loadMacAutostartState = async (): Promise<AutostartState> => {
  const status = await invoke<MacLaunchAtLoginStatus>('get_macos_launch_at_login_status');
  return getMacAutostartState(status);
};

const loadPluginAutostartState = async (): Promise<AutostartState> => ({
  enabled: await isAutostartEnabled(),
  error: null,
});

const enableMacAutostart = async (): Promise<AutostartState> => {
  const status = await invoke<MacLaunchAtLoginStatus>('enable_macos_launch_at_login');
  return getMacAutostartState(status);
};

const disableMacAutostart = async (): Promise<AutostartState> => {
  const status = await invoke<MacLaunchAtLoginStatus>('disable_macos_launch_at_login');
  return getMacAutostartState(status);
};

const setPluginAutostart = async (enabled: boolean): Promise<AutostartState> => {
  if (enabled) {
    await enableAutostart();
  } else {
    await disableAutostart();
  }

  return {
    enabled: await isAutostartEnabled(),
    error: null,
  };
};

const loadAutostartState = async (): Promise<AutostartState> =>
  isMacPlatform() ? loadMacAutostartState() : loadPluginAutostartState();

export const preloadAutostartState = async (): Promise<AutostartState> => {
  cachedAutostartState = await loadAutostartState();
  return cachedAutostartState;
};

export const useAutostart = () => {
  const [enabled, setEnabled] = useState<boolean | null>(cachedAutostartState?.enabled ?? null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(cachedAutostartState?.error ?? null);
  const isMac = isMacPlatform();

  const setAutostartState = useCallback((state: AutostartState) => {
    cachedAutostartState = state;
    setEnabled(state.enabled);
    setError(state.error);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadInitialAutostartState = async () => {
      try {
        const state = await preloadAutostartState();
        if (isMounted) {
          setAutostartState(state);
        }
      } catch (loadError) {
        console.error('Failed to read autostart state:', loadError);
        if (isMounted) {
          setAutostartState({
            enabled: false,
            error: 'Could not read launch-at-login status.',
          });
        }
      }
    };

    loadInitialAutostartState();

    return () => {
      isMounted = false;
    };
  }, [setAutostartState]);

  const setAutostartEnabled = useCallback(
    async (checked: boolean) => {
      const previousValue = enabled ?? false;
      cachedAutostartState = { enabled: checked, error: null };
      setEnabled(checked);
      setPending(true);
      setError(null);

      try {
        const nextState = isMac
          ? checked
            ? await enableMacAutostart()
            : await disableMacAutostart()
          : await setPluginAutostart(checked);
        setAutostartState(nextState);
      } catch (updateError) {
        console.error('Failed to update autostart state:', updateError);
        setAutostartState({
          enabled: previousValue,
          error: 'Could not update launch-at-login status.',
        });
      } finally {
        setPending(false);
      }
    },
    [enabled, isMac, setAutostartState]
  );

  return {
    enabled,
    pending,
    error,
    setEnabled: setAutostartEnabled,
  };
};
