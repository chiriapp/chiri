import Download from 'lucide-react/icons/download';
import FileText from 'lucide-react/icons/file-text';
import { useState } from 'react';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { ChangelogModal } from '$components/modals/ChangelogModal';
import type { UpdateInfo } from '$hooks/system/useUpdateChecker';

interface UpdateModalProps {
  updateInfo: UpdateInfo;
  onDownload: () => void;
  onDismiss: () => void;
  onClose: () => void;
  isDownloading: boolean;
  downloadProgress: number;
}

export const UpdateModal = ({
  updateInfo,
  onDownload,
  onClose,
  isDownloading,
  downloadProgress,
}: UpdateModalProps) => {
  const [showChangelogModal, setShowChangelogModal] = useState(false);

  return (
    <>
      <ModalWrapper
        onClose={onClose}
        title="Update Available"
        footer={
          <>
            <ModalButton variant="secondary" onClick={() => setShowChangelogModal(true)}>
              <FileText className="w-4 h-4" />
              View Changelog
            </ModalButton>
            <ModalButton onClick={onDownload} disabled={isDownloading} loading={isDownloading}>
              <Download className="w-4 h-4" />
              {isDownloading ? 'Downloading...' : 'Download & Install'}
            </ModalButton>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Version {updateInfo.version} is now available
          </p>

          <div className="text-sm text-surface-600 dark:text-surface-400 space-y-1">
            <p>Current version: {updateInfo.currentVersion}</p>
            {updateInfo.date && <p>Released: {new Date(updateInfo.date).toLocaleDateString()}</p>}
          </div>

          {isDownloading && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-surface-600 dark:text-surface-400">
                  Downloading...
                </span>
                <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  {Math.round(downloadProgress)}%
                </span>
              </div>
              <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary-600 dark:bg-primary-500 h-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </ModalWrapper>

      {showChangelogModal && (
        <ChangelogModal
          version={updateInfo.version}
          changelog={updateInfo.body || ''}
          onClose={() => setShowChangelogModal(false)}
        />
      )}
    </>
  );
};
