import { useEffect, useState } from 'react';
import {
  installAppImageDesktopIntegration,
  isAppImageDesktopIntegrationNeeded,
  skipAppImageDesktopIntegration,
} from '$utils/platform';

export const useAppImageIntegration = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIntegrating, setIsIntegrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    isAppImageDesktopIntegrationNeeded().then((needed) => {
      if (!cancelled) {
        setShowPrompt(needed);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const integrate = async () => {
    setIsIntegrating(true);
    setError(null);
    const success = await installAppImageDesktopIntegration();
    setIsIntegrating(false);
    if (success) {
      setShowPrompt(false);
      setError(null);
    } else {
      setError('Could not install desktop integration. You can try again from Settings later.');
    }
  };

  const skip = async () => {
    await skipAppImageDesktopIntegration();
    setShowPrompt(false);
    setError(null);
  };

  return {
    showPrompt,
    isIntegrating,
    error,
    integrate,
    skip,
  };
};
