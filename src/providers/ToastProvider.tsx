import { Toaster } from 'sonner';
import { useSettingsStore } from '$context/settingsContext';

export const ToastProvider = () => {
  // raise the z-index of toasts during onboarding to make sure users see toasts like "hold / double press Cmd+Q to quit"
  const { onboardingCompleted } = useSettingsStore();

  return (
    <Toaster
      position="bottom-right"
      expand={false}
      style={{ zIndex: onboardingCompleted ? 40 : 70 }}
      toastOptions={{
        classNames: {
          toast:
            'group bg-white! dark:bg-surface-800! border! border-surface-200! dark:border-surface-700! shadow-lg! rounded-lg!',
          title: 'text-surface-900! dark:text-surface-100! font-semibold!',
          description: 'text-surface-600! dark:text-surface-400!',
          actionButton:
            'bg-primary-500! hover:bg-primary-600! text-primary-contrast! border-0! rounded-md!',
          cancelButton:
            'bg-surface-100! dark:bg-surface-700! hover:bg-surface-200! dark:hover:bg-surface-600! text-surface-700! dark:text-surface-300! border-0! rounded-md!',
          closeButton:
            'bg-surface-100! dark:bg-surface-700! hover:bg-surface-200! dark:hover:bg-surface-600! text-surface-500! dark:text-surface-400! border! border-surface-200! dark:border-surface-600! rounded-md!',
          success: 'text-semantic-success!',
          error: 'text-semantic-error!',
          warning: 'text-semantic-warning!',
          info: 'text-primary-500!',
        },
      }}
    />
  );
};
