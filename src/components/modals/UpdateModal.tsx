import ArrowRight from 'lucide-react/icons/arrow-right';
import ArrowUpCircle from 'lucide-react/icons/arrow-up-circle';
import Download from 'lucide-react/icons/download';
import { marked } from 'marked';
import { useMemo, useState } from 'react';
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

const stripDownloadSection = (text: string) =>
  text
    .replace(/---\s*\n+##\s*📥\s*Downloads.*$/s, '')
    .replace(/\n+##\s*📥\s*Downloads.*$/s, '')
    .trim();

export const UpdateModal = ({
  updateInfo,
  onDownload,
  onDismiss,
  onClose,
  isDownloading,
  downloadProgress,
}: UpdateModalProps) => {
  const [showChangelogModal, setShowChangelogModal] = useState(false);

  const changelogHtml = useMemo(() => {
    if (!updateInfo.body) return '';
    return marked.parse(stripDownloadSection(updateInfo.body)) as string;
  }, [updateInfo.body]);

  const hasChangelog = changelogHtml.trim().length > 0;

  const releaseDate = updateInfo.date
    ? new Date(updateInfo.date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <>
      <ModalWrapper
        onClose={onClose}
        title="Update Available"
        footerLeft={
          <ModalButton variant="ghost" onClick={onDismiss} disabled={isDownloading}>
            Remind me later
          </ModalButton>
        }
        footer={
          <ModalButton onClick={onDownload} disabled={isDownloading} loading={isDownloading}>
            {!isDownloading && <Download className="w-4 h-4" />}
            {isDownloading ? 'Downloading...' : 'Download & Install'}
          </ModalButton>
        }
      >
        <div className="space-y-4">
          {/* Version hero */}
          <div className="flex items-center gap-3 p-3.5 bg-surface-100 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700">
            <div className="shrink-0 w-9 h-9 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
              <ArrowUpCircle className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-mono text-surface-500 dark:text-surface-300">
                  v{updateInfo.currentVersion}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-surface-400 dark:text-surface-300 shrink-0" />
                <span className="text-sm font-semibold font-mono text-primary-600 dark:text-primary-400">
                  v{updateInfo.version}
                </span>
              </div>
              {releaseDate && (
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  Released {releaseDate}
                </p>
              )}
            </div>
          </div>

          {/* Changelog teaser */}
          {hasChangelog && (
            <div>
              <div className="relative overflow-hidden rounded-lg max-h-36">
                <div
                  className="text-sm prose prose-sm dark:prose-invert max-w-none px-1
                    [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-surface-800 dark:[&_h2]:text-surface-200 [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2:first-child]:mt-0
                    [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-surface-700 dark:[&_h3]:text-surface-300 [&_h3]:mt-2 [&_h3]:mb-1
                    [&_p]:text-surface-600 dark:[&_p]:text-surface-400 [&_p]:my-1
                    [&_ul]:list-disc [&_ul]:list-outside [&_ul]:ml-4 [&_ul]:my-1 [&_ul]:space-y-0.5 [&_ul]:text-surface-600 dark:[&_ul]:text-surface-400
                    [&_strong]:font-semibold
                    [&_a]:text-primary-600 dark:[&_a]:text-primary-400"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: Markdown from trusted changelog content
                  dangerouslySetInnerHTML={{ __html: changelogHtml }}
                />
                <div className="absolute bottom-0 inset-x-0 h-14 bg-linear-to-t from-white dark:from-surface-800 to-transparent pointer-events-none" />
              </div>
              <button
                type="button"
                onClick={() => setShowChangelogModal(true)}
                className="mt-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                Read more
              </button>
            </div>
          )}

          {/* Download progress */}
          {isDownloading && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-surface-500 dark:text-surface-400">Downloading update…</span>
                <span className="font-medium tabular-nums text-surface-700 dark:text-surface-300">
                  {Math.round(downloadProgress)}%
                </span>
              </div>
              <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary-500 h-full rounded-full transition-all duration-300 ease-out"
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
