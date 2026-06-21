import { useQuery } from '@tanstack/react-query';
import { loggers } from '$lib/logger';
import { getInstallType } from '$utils/platform';

const log = loggers.platform;

/**
 * hook to detect if the app is running under a managed installation
 * where updates are handled externally
 */
export const useManagedInstallation = () => {
  const query = useQuery({
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

  const installType = query.data ?? null;

  const isManagedInstall = installType !== null && installType !== 'standard';

  return {
    isManagedInstall,
    installType,
    isLoading: query.isPending,
  };
};
