import { openUrl } from '@tauri-apps/plugin-opener';
import ExternalLink from 'lucide-react/icons/external-link';
import X from 'lucide-react/icons/x';
import { marked } from 'marked';
import { useMemo } from 'react';
import { useFocusTrap } from '$hooks/useFocusTrap';
import { useModalEscapeKey } from '$hooks/useModalEscapeKey';

interface ChangelogModalProps {
  version: string;
  changelog: string;
  onClose: () => void;
}

/**
 * Remove download footer from changelog
 */
const cleanChangelog = (text: string) => {
  // Remove the "Download the appropriate installer..." line and everything after
  return text
    .replace(/---\s*\n+📥.*$/s, '')
    .replace(/\n+📥.*$/s, '')
    .trim();
};

export const ChangelogModal = ({ version, changelog, onClose }: ChangelogModalProps) => {
  const focusTrapRef = useFocusTrap();
  useModalEscapeKey(onClose);

  const cleanedChangelog = cleanChangelog(changelog);
  const hasContent = cleanedChangelog.trim().length > 0;

  const renderedHtml = useMemo(() => {
    if (!hasContent) return '';
    return marked.parse(cleanedChangelog);
  }, [cleanedChangelog, hasContent]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop does not require keyboard handler; ESC key closes modal via custom handler
    // biome-ignore lint/a11y/useKeyWithClickEvents: Modal backdrop is non-interactive; users close with Escape or X button
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={focusTrapRef}
        className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col animate-scale-in"
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700 shrink-0">
          <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">
            What's new in {version}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {hasContent ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none
                [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-surface-800 dark:[&_h2]:text-surface-200 [&_h2]:mt-4 [&_h2]:mb-2 [&_h2:first-child]:mt-0
                [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-surface-700 dark:[&_h3]:text-surface-300 [&_h3]:mt-3 [&_h3]:mb-2
                [&_p]:text-sm [&_p]:text-surface-700 dark:[&_p]:text-surface-300 [&_p]:my-2
                [&_ul]:list-disc [&_ul]:list-outside [&_ul]:space-y-1 [&_ul]:my-2 [&_ul]:text-surface-700 dark:[&_ul]:text-surface-300 [&_ul]:ml-4
                [&_strong]:font-semibold
                [&_a]:text-primary-600 dark:[&_a]:text-primary-400 [&_a]:hover:underline
                [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:bg-surface-100 dark:[&_code]:bg-surface-800 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: Markdown is rendered from trusted changelog content
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          ) : (
            <p className="text-sm text-surface-500 dark:text-surface-400 italic text-center py-8">
              No changelog available for this release.
            </p>
          )}
        </div>

        <div className="flex justify-between p-4 border-t border-surface-200 dark:border-surface-700 shrink-0">
          <button
            type="button"
            onClick={() => {
              openUrl(`https://github.com/SapphoSys/chiri/releases/tag/app-v${version}`);
            }}
            className="px-4 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <ExternalLink className="w-4 h-4" />
            View on GitHub
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm bg-primary-600 text-primary-contrast rounded-lg hover:bg-primary-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
