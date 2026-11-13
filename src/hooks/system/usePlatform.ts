import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { queryKeys } from '$lib/query-client';
import { isLinuxPlatform } from '$utils/platform';

export const usePlatform = () => {
  const isLinux = isLinuxPlatform();

  const gnomeQuery = useQuery({
    queryKey: queryKeys.platform.isGnomeDesktop,
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

  const kdeQuery = useQuery({
    queryKey: queryKeys.platform.isKdeDesktop,
    enabled: isLinux,
    queryFn: async () => {
      try {
        return await invoke<boolean>('is_kde_desktop');
      } catch (error) {
        console.error('Failed to detect KDE desktop:', error);
        return false;
      }
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  return {
    isGNOME: isLinux && (gnomeQuery.data ?? false),
    isKDE: isLinux && (kdeQuery.data ?? false),
    isLoading: isLinux && (gnomeQuery.isPending || kdeQuery.isPending),
  };
};
