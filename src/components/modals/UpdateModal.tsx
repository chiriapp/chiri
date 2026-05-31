import ArrowRight from 'lucide-react/icons/arrow-right';
import Download from 'lucide-react/icons/download';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import { marked } from 'marked';
import { useMemo, useState } from 'react';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { ChangelogModal } from '$components/modals/ChangelogModal';
import type { UpdateError, UpdateInfo } from '$hooks/system/useUpdateChecker';
import { cleanChangelog, getChangelogPreview } from '$utils/github';

interface UpdateModalProps {
  updateInfo: UpdateInfo;
  onDownload: () => void;
  onDismiss: () => void;
  onClose: () => void;
  isDownloading: boolean;
  downloadProgress: number;
  error: UpdateError | null;
}

export const UpdateModal = ({
  updateInfo,
  onDownload,
  onDismiss,
  onClose,
  isDownloading,
  downloadProgress,
  error,
}: UpdateModalProps) => {
  const [showChangelogModal, setShowChangelogModal] = useState(false);

  const cleanedChangelog = useMemo(() => cleanChangelog(updateInfo.body ?? ''), [updateInfo.body]);
  const changelogPreview = useMemo(() => getChangelogPreview(cleanedChangelog), [cleanedChangelog]);

  const changelogHtml = useMemo(() => {
    if (!changelogPreview) return '';
    return marked.parse(changelogPreview) as string;
  }, [changelogPreview]);

  const hasChangelog = changelogHtml.trim().length > 0;

  const releaseDate = useMemo(() => {
    if (!updateInfo.date) return null;

    const date = new Date(updateInfo.date);
    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [updateInfo.date]);

  const boundedProgress = Math.min(100, Math.max(0, downloadProgress));
  const primaryLabel = error?.kind === 'download' ? 'Retry download' : 'Install update';

  return (
    <>
      <ModalWrapper
        onClose={onClose}
        title="Update available"
        description={`Chiri ${updateInfo.version} is ready to be installed.`}
        zIndex="z-60"
        size="lg"
        preventClose={isDownloading}
        footer={
          <>
            <ModalButton variant="ghost" onClick={onDismiss} disabled={isDownloading}>
              Remind me later
            </ModalButton>
            <ModalButton onClick={onDownload} disabled={isDownloading} loading={isDownloading}>
              {!isDownloading &&
                (error?.kind === 'download' ? (
                  <RefreshCw className="w-4 h-4" />
                ) : (
                  <Download className="w-4 h-4" />
                ))}
              {isDownloading ? 'Downloading...' : primaryLabel}
            </ModalButton>
          </>
        }
      >
        <div className="space-y-5">
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-surface-500 dark:text-surface-400">
                v{updateInfo.currentVersion}
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-surface-400 dark:text-surface-500" />
              <span className="font-mono text-sm font-semibold text-surface-900 dark:text-surface-100">
                v{updateInfo.version}
              </span>
            </div>

            {releaseDate && (
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Released {releaseDate}
              </p>
            )}

            <p className="max-w-xl text-sm text-surface-600 dark:text-surface-400">
              Chiri will relaunch automatically after the update is installed.
            </p>
          </section>

          {error && (
            <div role="alert" className="border-l-2 border-semantic-error py-0.5 pl-3">
              <p className="text-sm font-semibold text-semantic-error">{error.title}</p>
              <p className="mt-1 text-xs text-semantic-error/90">{error.description}</p>
            </div>
          )}

          {isDownloading && (
            <section className="space-y-2 border-t border-surface-200 pt-4 dark:border-surface-700">
              <div className="flex items-center justify-between gap-3 text-xs" aria-live="polite">
                <span className="font-medium text-surface-700 dark:text-surface-300">
                  Downloading update
                </span>
                <span className="font-medium tabular-nums text-surface-700 dark:text-surface-300">
                  {Math.round(boundedProgress)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all duration-300 ease-out"
                  style={{ width: `${boundedProgress}%` }}
                />
              </div>
            </section>
          )}

          {!isDownloading && (
            <section className="border-t border-surface-200 pt-4 dark:border-surface-700">
              <h3 className="mb-3 text-base font-semibold text-surface-800 dark:text-surface-200">
                What's new
              </h3>

              {hasChangelog ? (
                <>
                  <div className="relative max-h-44 overflow-hidden">
                    <div
                      className="prose prose-sm max-w-none text-sm dark:prose-invert
                    [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-surface-800 [&_h2:first-child]:mt-0 dark:[&_h2]:text-surface-200
                    [&_h3]:mb-1.5 [&_h3]:mt-3 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-surface-700 dark:[&_h3]:text-surface-300
                    [&_p]:my-1.5 [&_p]:text-surface-600 dark:[&_p]:text-surface-400
                    [&_ul]:mb-0 [&_ul]:mt-1.5 [&_ul]:ml-4 [&_ul]:list-outside [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:text-surface-600 dark:[&_ul]:text-surface-400
                    [&_strong]:font-semibold
                    [&_a]:text-primary-600 hover:[&_a]:underline dark:[&_a]:text-primary-400
                    [&_code]:rounded-sm [&_code]:bg-surface-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs dark:[&_code]:bg-surface-800"
                      // biome-ignore lint/security/noDangerouslySetInnerHtml: Markdown is rendered from trusted changelog content
                      dangerouslySetInnerHTML={{ __html: changelogHtml }}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-white to-transparent dark:from-surface-800" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowChangelogModal(true)}
                    className="text-xs font-medium text-primary-600 outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-primary-400"
                  >
                    Show all
                  </button>
                </>
              ) : (
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  No release notes were published for this update.
                </p>
              )}
            </section>
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
