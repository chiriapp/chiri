import { openUrl } from '@tauri-apps/plugin-opener';
import ExternalLink from 'lucide-react/icons/external-link';
import { marked } from 'marked';
import { useMemo } from 'react';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';

interface ChangelogModalProps {
  version: string;
  changelog: string;
  onClose: () => void;
}

/**
 * Remove download footer from changelog
 */
const cleanChangelog = (text: string) => {
  // Remove the "## 📥 Downloads" section and everything after
  return text
    .replace(/---\s*\n+##\s*📥\s*Downloads.*$/s, '')
    .replace(/\n+##\s*📥\s*Downloads.*$/s, '')
    .trim();
};

export const ChangelogModal = ({ version, changelog, onClose }: ChangelogModalProps) => {
  const cleanedChangelog = cleanChangelog(changelog);
  const hasContent = cleanedChangelog.trim().length > 0;

  const renderedHtml = useMemo(() => {
    if (!hasContent) return '';
    return marked.parse(cleanedChangelog);
  }, [cleanedChangelog, hasContent]);

  return (
    <ModalWrapper
      onClose={onClose}
      title={`What's new in ${version}`}
      className="max-w-2xl max-h-[80vh]"
      footerLeft={
        <ModalButton
          variant="ghost"
          onClick={() => {
            openUrl(`https://github.com/chiriapp/chiri/releases/tag/app-v${version}`);
          }}
        >
          <ExternalLink className="w-4 h-4" />
          View on GitHub
        </ModalButton>
      }
      footer={<ModalButton onClick={onClose}>Close</ModalButton>}
    >
      {hasContent ? (
        <div
          className="prose prose-sm dark:prose-invert max-w-none
            [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-surface-800 dark:[&_h2]:text-surface-200 [&_h2]:mt-4 [&_h2]:mb-2 [&_h2:first-child]:mt-0
            [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-surface-700 dark:[&_h3]:text-surface-300 [&_h3]:mt-3 [&_h3]:mb-2
            [&_p]:text-sm [&_p]:text-surface-700 dark:[&_p]:text-surface-300 [&_p]:my-2
            [&_ul]:list-disc [&_ul]:list-outside [&_ul]:space-y-1 [&_ul]:my-2 [&_ul]:text-surface-700 dark:[&_ul]:text-surface-300 [&_ul]:ml-4
            [&_strong]:font-semibold
            [&_a]:text-primary-600 dark:[&_a]:text-primary-400 hover:[&_a]:underline
            [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:bg-surface-100 dark:[&_code]:bg-surface-800 [&_code]:rounded-sm [&_code]:text-xs [&_code]:font-mono"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Markdown is rendered from trusted changelog content
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      ) : (
        <p className="text-sm text-surface-500 dark:text-surface-400 italic text-center py-8">
          No changelog available for this release.
        </p>
      )}
    </ModalWrapper>
  );
};
