import Check from 'lucide-react/icons/check';
import { createElement, useEffect, useState } from 'react';
import { toastManager } from '$hooks/ui/useToast';
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
      toastManager.success(
        createElement(
          'span',
          { className: 'inline-flex items-center gap-2' },
          createElement(Check, {
            className: 'h-4 w-4 shrink-0 text-primary-500',
            'aria-hidden': true,
          }),
          'Chiri added to your app menu',
        ),
        'You can launch it from there next time you want to use the app.',
        'appimage-integration-success',
        undefined,
        false,
        { icon: null },
      );
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
