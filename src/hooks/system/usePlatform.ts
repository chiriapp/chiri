import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

export const usePlatform = () => {
  const query = useQuery({
    queryKey: ['platform', 'isGnomeDesktop'],
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
    isGNOME: query.data ?? false,
    isLoading: query.isPending,
  };
};
