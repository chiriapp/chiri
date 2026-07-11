import { useQuery } from '@tanstack/react-query';
import { loggers } from '$lib/logger';
import { getInstallType, shouldDisableUpdates } from '$utils/platform';

const log = loggers.platform;

/**
 * hook to detect if the app is running under a managed installation
 * where updates are handled externally
 */
export const useManagedInstallation = () => {
  const installTypeQuery = useQuery({
    queryKey: ['platform', 'installType'],
    queryFn: async () => {
      try {
        return await getInstallType();
      } catch (error) {
        log.error('[Platform] Failed to get installation type:', error);
        return 'standard';
      }
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  const managedQuery = useQuery({
    queryKey: ['platform', 'shouldDisableUpdates'],
    queryFn: async () => {
      try {
        return await shouldDisableUpdates();
      } catch (error) {
        log.error('[Platform] Failed to check managed installation status:', error);
        return false;
      }
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  const installType = installTypeQuery.data ?? null;
  const isManagedInstall = managedQuery.data ?? false;

  return {
    isManagedInstall,
    installType,
    isLoading: installTypeQuery.isPending || managedQuery.isPending,
  };
};
