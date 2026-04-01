import Download from 'lucide-react/icons/download';
import FileText from 'lucide-react/icons/file-text';
import X from 'lucide-react/icons/x';
import { useState } from 'react';
import { ChangelogModal } from '$components/modals/ChangelogModal';
import type { UpdateInfo } from '$hooks/system/useUpdateChecker';
import { useFocusTrap } from '$hooks/ui/useFocusTrap';
import { useModalEscapeKey } from '$hooks/ui/useModalEscapeKey';

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
  const focusTrapRef = useFocusTrap();
  const [showChangelogModal, setShowChangelogModal] = useState(false);
  useModalEscapeKey(onClose);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop does not require keyboard handler; ESC key closes modal via custom handler
    // biome-ignore lint/a11y/useKeyWithClickEvents: Modal backdrop is non-interactive; users close with Escape or X button
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={focusTrapRef}
        className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-md mx-4 animate-scale-in"
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">
            Update Available
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
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

        <div className="flex justify-end gap-2 p-4 border-t border-surface-200 dark:border-surface-700">
          <button
            type="button"
            className="px-4 py-2 text-sm text-surface-700 dark:text-surface-300 bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700 rounded-lg transition-colors flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            onClick={() => setShowChangelogModal(true)}
          >
            <FileText className="w-4 h-4" />
            View Changelog
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className="px-4 py-2 text-sm bg-primary-600 text-primary-contrast rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-inset"
          >
            <Download className="w-4 h-4" />
            {isDownloading ? 'Downloading...' : 'Download & Install'}
          </button>
        </div>
      </div>

      {showChangelogModal && (
        <ChangelogModal
          version={updateInfo.version}
          changelog={updateInfo.body || ''}
          onClose={() => setShowChangelogModal(false)}
        />
      )}
    </div>
  );
};
