import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { isLinuxPlatform } from '$utils/platform';

export const usePlatform = () => {
  const isLinux = isLinuxPlatform();

  const query = useQuery({
    queryKey: ['platform', 'isGnomeDesktop'],
    enabled: isLinux,
    queryFn: async () => {
      try {
        return await invoke<boolean>('is_gnome_desktop');
      } catch (error) {
        console.error('Failed to detect GNOME desktop:', error);
        return false;
      }
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  return {
    isGNOME: isLinux && (query.data ?? false),
    isLoading: isLinux && query.isPending,
  };
};
