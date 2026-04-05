import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { loggers } from '$lib/logger';
import type { InstallType } from '$types';

const log = loggers.platform;

/**
 * Hook to detect if the app is running under a managed installation
 * where updates are handled externally.
 */
export const useManagedInstallation = () => {
  const query = useQuery({
    queryKey: ['platform', 'installType'],
    queryFn: async () => {
      try {
        return await invoke<InstallType>('get_install_type');
      } catch (error) {
        log.error('[Platform] Failed to get installation type:', error);
        return 'standard';
      }
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  const installType = query.data ?? null;

  const isManagedInstall = installType !== null && installType !== 'standard';

  return {
    isManagedInstall,
    installType,
    isLoading: query.isPending,
  };
};
