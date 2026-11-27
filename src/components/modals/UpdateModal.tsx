import CircleX from 'lucide-react/icons/circle-x';
import Download from 'lucide-react/icons/download';
import FileText from 'lucide-react/icons/file-text';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { ChangelogModal } from '$components/modals/ChangelogModal';
import type { UpdateError, UpdateInfo } from '$hooks/system/useUpdateChecker';
import { useEasedValue } from '$hooks/ui/useEasedValue';
import { useChangelog } from '$hooks/useChangelog';

interface UpdateModalProps {
  updateInfo: UpdateInfo;
  onDownload: () => void;
  onDismiss: () => void;
  onClose: () => void;
  isDownloading: boolean;
  downloadProgress: number;
  isInstalling: boolean;
  error: UpdateError | null;
  zIndex?: 'z-60' | 'z-70';
}

export const UpdateModal = ({
  updateInfo,
  onDownload,
  onDismiss,
  onClose,
  isDownloading,
  downloadProgress,
  isInstalling,
  error,
  zIndex = 'z-60',
}: UpdateModalProps) => {
  const { openChangelog, closeChangelog, changelogData } = useChangelog();

  const boundedProgress = Math.min(100, Math.max(0, downloadProgress));
  const displayedProgress = useEasedValue(boundedProgress);
  // the download is over as soon as the last byte lands, but the bar still eases up to full
  const isProgressFull = Math.round(displayedProgress) >= 100;
  const primaryLabel = error?.kind === 'download' ? 'Retry download' : 'Install update';

  return (
    <>
      <ModalWrapper
        onClose={onClose}
        title={isDownloading ? 'Update in progress' : 'New update available'}
        zIndex={zIndex}
        size="md"
        preventClose={isDownloading}
        footer={
          isDownloading ? undefined : (
            <>
              <ModalButton variant="secondary" onClick={onDismiss}>
                Remind me later
              </ModalButton>
              <ModalButton onClick={onDownload}>
                {error?.kind === 'download' ? (
                  <RefreshCw className="h-4 w-4" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {primaryLabel}
              </ModalButton>
            </>
          )
        }
      >
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-semantic-error/30 bg-semantic-error/10 p-3 text-sm text-surface-700 dark:text-surface-300"
          >
            <CircleX className="mt-0.5 size-4 shrink-0 text-semantic-error" />
            <div className="min-w-0">
              <p className="font-medium text-semantic-error">{error.title}</p>
              <p className="mt-1 text-xs">{error.description}</p>
            </div>
          </div>
        )}

        {isDownloading ? (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-surface-600 dark:text-surface-400" aria-live="polite">
                {isInstalling && isProgressFull ? 'Installing update' : 'Downloading update'}
              </span>
              <span className="font-medium text-surface-800 tabular-nums dark:text-surface-200">
                {Math.round(displayedProgress)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
              <div
                className="h-full rounded-full bg-primary-500"
                style={{ width: `${displayedProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Chiri v{updateInfo.version} is now available to install.
            </p>
            <button
              type="button"
              onClick={() =>
                openChangelog(updateInfo.version, {
                  body: updateInfo.body ?? '',
                  date: updateInfo.date,
                })
              }
              className="flex items-center gap-1.5 font-medium text-primary-ink text-sm outline-hidden transition-colors hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary-ink dark:text-primary-400"
            >
              <FileText className="size-3.5" />
              See what's new →
            </button>
          </div>
        )}
      </ModalWrapper>

      {changelogData && (
        <ChangelogModal
          version={changelogData.version}
          html={changelogData.html}
          date={changelogData.date}
          onClose={closeChangelog}
        />
      )}
    </>
  );
};
