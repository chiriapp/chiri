import { invoke } from '@tauri-apps/api/core';
import ArrowRight from 'lucide-react/icons/arrow-right';
import Download from 'lucide-react/icons/download';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChangelogProse } from '$components/ChangelogProse';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { ChangelogModal } from '$components/modals/ChangelogModal';
import type { UpdateError, UpdateInfo } from '$hooks/system/useUpdateChecker';
import { cleanChangelog, getChangelogPreview } from '$utils/meta';
import { handleExternalLinkClick } from '$utils/misc';

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

  const [changelogHtml, setChangelogHtml] = useState('');

  useEffect(() => {
    if (!changelogPreview) {
      setChangelogHtml('');
      return;
    }

    let isMounted = true;
    invoke<string>('parse_and_sanitize_markdown', { markdown: changelogPreview })
      .then((html) => {
        if (isMounted) setChangelogHtml(html);
      })
      .catch(console.error);

    return () => {
      isMounted = false;
    };
  }, [changelogPreview]);

  const hasChangelog = changelogHtml.trim().length > 0;

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    el.addEventListener('click', handleExternalLinkClick);
    return () => el.removeEventListener('click', handleExternalLinkClick);
  }, []);

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
            <ModalButton variant="secondary" onClick={onDismiss} disabled={isDownloading}>
              Remind me later
            </ModalButton>
            <ModalButton onClick={onDownload} disabled={isDownloading} loading={isDownloading}>
              {!isDownloading &&
                (error?.kind === 'download' ? (
                  <RefreshCw className="h-4 w-4" />
                ) : (
                  <Download className="h-4 w-4" />
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
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-surface-500 dark:text-surface-400" />
              <span className="font-mono font-semibold text-sm text-surface-900 dark:text-surface-100">
                v{updateInfo.version}
              </span>
            </div>

            {releaseDate && (
              <p className="text-surface-500 text-xs dark:text-surface-400">
                Released {releaseDate}
              </p>
            )}

            <p className="max-w-xl text-sm text-surface-600 dark:text-surface-400">
              Chiri will relaunch automatically after the update is installed.
            </p>
          </section>

          {error && (
            <div role="alert" className="border-semantic-error border-l-2 py-0.5 pl-3">
              <p className="font-semibold text-semantic-error text-sm">{error.title}</p>
              <p className="mt-1 text-semantic-error/90 text-xs">{error.description}</p>
            </div>
          )}

          {isDownloading && (
            <section className="space-y-2 border-surface-300 border-t pt-4 dark:border-surface-700">
              <div className="flex items-center justify-between gap-3 text-xs" aria-live="polite">
                <span className="font-medium text-surface-700 dark:text-surface-300">
                  Downloading update
                </span>
                <span className="font-medium text-surface-700 tabular-nums dark:text-surface-300">
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
            <section className="border-surface-300 border-t pt-4 dark:border-surface-700">
              <h3 className="mb-3 font-semibold text-base text-surface-800 dark:text-surface-200">
                What's new
              </h3>

              {hasChangelog ? (
                <>
                  <div className="relative max-h-44 overflow-hidden">
                    <ChangelogProse
                      html={changelogHtml}
                      density="compact"
                      contentRef={contentRef}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-white to-transparent dark:from-surface-800" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowChangelogModal(true)}
                    className="font-medium text-primary-ink text-xs outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:text-primary-400"
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
          date={updateInfo.date}
          onClose={() => setShowChangelogModal(false)}
        />
      )}
    </>
  );
};
