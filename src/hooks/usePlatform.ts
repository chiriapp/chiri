import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from 'react';

export const usePlatform = () => {
  const [isGNOME, setIsGNOME] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    invoke<boolean>('is_gnome_desktop')
      .then((result) => {
        setIsGNOME(result);
      })
      .catch((error) => {
        console.error('Failed to detect GNOME desktop:', error);
        setIsGNOME(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return { isGNOME, isLoading };
};
