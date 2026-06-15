import Download from 'lucide-react/icons/download';
import KeyRound from 'lucide-react/icons/key-round';
import Smartphone from 'lucide-react/icons/smartphone';
import Wifi from 'lucide-react/icons/wifi';
import { useState } from 'react';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import type { Account } from '$types';
import { isMacPlatform } from '$utils/platform';

interface MobileConfigExportModalProps {
  account: Account;
  onConfirm: (includePassword: boolean) => void;
  onClose: () => void;
}

export const MobileConfigExportModal = ({
  account,
  onConfirm,
  onClose,
}: MobileConfigExportModalProps) => {
  const [includePassword, setIncludePassword] = useState(false);

  return (
    <ModalWrapper
      onClose={onClose}
      title="Export to .mobileconfig"
      description={`Set up "${account.name}" on your iPhone, iPad, or Mac`}
      size="md"
      zIndex="z-70"
      initialFocus="dialog"
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose}>
            Cancel
          </ModalButton>
          <ModalButton onClick={() => onConfirm(includePassword)}>
            <Download className="h-4 w-4" />
            Export
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4">
        {/* Mini infographic */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 px-2 py-3 text-center dark:border-surface-700 dark:bg-surface-900/50">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/10 text-primary-500">
              <Download className="h-4 w-4" />
            </div>
            <p className="text-surface-700 text-xs leading-snug dark:text-surface-300">
              Download the file
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 px-2 py-3 text-center dark:border-surface-700 dark:bg-surface-900/50">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/10 text-primary-500">
              <Wifi className="h-4 w-4" />
            </div>
            <p className="text-surface-700 text-xs leading-snug dark:text-surface-300">
              {isMacPlatform() ? 'AirDrop or share it' : 'Share it to your device'}
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 px-2 py-3 text-center dark:border-surface-700 dark:bg-surface-900/50">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/10 text-primary-500">
              <Smartphone className="h-4 w-4" />
            </div>
            <p className="text-surface-700 text-xs leading-snug dark:text-surface-300">
              Install on device
            </p>
          </div>
        </div>

        <p className="text-sm text-surface-500 leading-relaxed dark:text-surface-400">
          A{' '}
          <span className="font-medium text-surface-700 dark:text-surface-300">.mobileconfig</span>{' '}
          file is an Apple Configuration Profile that automatically sets up your CalDAV account in
          one tap.{' '}
        </p>

        <p className="text-sm text-surface-500 leading-relaxed dark:text-surface-400">
          <a
            href="https://support.apple.com/guide/mdm/intro-to-device-management-profiles-mdm0d350920d/1/web/1.0"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary-500 hover:underline hover:opacity-80"
          >
            Learn more about .mobileconfig files
          </a>
        </p>

        {/* Password option */}
        <div className="rounded-lg border border-surface-200 dark:border-surface-700">
          <label className="flex cursor-pointer items-start gap-3 p-3">
            <input
              id="mobileconfig-include-password"
              type="checkbox"
              checked={includePassword}
              onChange={(e) => setIncludePassword(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-surface-600"
            />
            <div>
              <p className="flex items-center gap-1.5 font-medium text-sm text-surface-700 dark:text-surface-300">
                <KeyRound className="h-3.5 w-3.5 shrink-0 text-surface-500 dark:text-surface-400" />
                Include password
              </p>
              <p className="mt-0.5 text-surface-500 text-xs leading-relaxed dark:text-surface-400">
                {includePassword
                  ? 'Password will be embedded. The device signs in automatically with no prompts.'
                  : 'Password will not be stored in the file. The device will ask for it during installation.'}
              </p>
            </div>
          </label>
        </div>
      </div>
    </ModalWrapper>
  );
};
