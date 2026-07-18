import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { isLinuxPlatform } from '$utils/platform';

export const useTrayHostAvailability = () => {
  const isLinux = isLinuxPlatform();

  const query = useQuery({
    queryKey: ['platform', 'trayHostAvailable'],
    enabled: isLinux,
    queryFn: async () => {
      try {
        return await invoke<boolean>('is_tray_host_available');
      } catch (error) {
        console.error('Failed to detect tray host availability:', error);
        return false;
      }
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  return {
    isAvailable: query.data ?? null,
    isLoading: isLinux && query.isPending,
  };
};
