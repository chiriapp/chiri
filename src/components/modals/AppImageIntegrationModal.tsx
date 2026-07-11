import AppIcon from '$components/Icon';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';

interface AppImageIntegrationModalProps {
  isIntegrating: boolean;
  error: string | null;
  onIntegrate: () => void;
  onSkip: () => void;
}

export const AppImageIntegrationModal = ({
  isIntegrating,
  error,
  onIntegrate,
  onSkip,
}: AppImageIntegrationModalProps) => {
  return (
    <ModalWrapper
      onClose={onSkip}
      zIndex="z-70"
      className="max-w-md"
      backdropClassName="bg-black/35 backdrop-blur-md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <ModalButton variant="secondary" onClick={onSkip} disabled={isIntegrating}>
            Not now
          </ModalButton>
          <ModalButton onClick={onIntegrate} disabled={isIntegrating}>
            Integrate with desktop
          </ModalButton>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-500 text-primary-contrast">
          <AppIcon className="h-7 w-7" />
        </div>
        <div>
          <h2 className="font-semibold text-surface-950 text-xl dark:text-surface-50">
            Integrate Chiri with your desktop?
          </h2>
          <p className="mt-2 text-sm text-surface-600 leading-6 dark:text-surface-400">
            You are running Chiri as an AppImage. Adding a desktop entry moves the AppImage to your{' '}
            <code className="rounded bg-surface-100 px-1 py-0.5 font-mono text-xs dark:bg-surface-700">
              ~/Applications
            </code>{' '}
            folder and installs the icon so Chiri appears in your app menu and its window icon shows
            correctly in some desktop environments.
          </p>
          {error && (
            <p className="mt-3 rounded-lg bg-error-100 p-2.5 text-error-700 text-sm dark:bg-error-900/30 dark:text-error-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
};
