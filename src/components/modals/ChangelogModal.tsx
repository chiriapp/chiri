import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import ExternalLink from 'lucide-react/icons/external-link';
import { useEffect, useRef, useState } from 'react';
import { ChangelogProse } from '$components/ChangelogProse';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { useSettingsStore } from '$context/settingsContext';
import { formatDate } from '$utils/date';
import { cleanChangelog } from '$utils/meta';
import { handleExternalLinkClick } from '$utils/misc';

interface ChangelogModalProps {
  version: string;
  changelog: string;
  date?: string;
  onClose: () => void;
}

export const ChangelogModal = ({ version, changelog, date, onClose }: ChangelogModalProps) => {
  const { dateFormat } = useSettingsStore();
  const cleanedChangelog = cleanChangelog(changelog);
  const hasContent = cleanedChangelog.trim().length > 0;

  const [renderedHtml, setRenderedHtml] = useState('');

  useEffect(() => {
    if (!hasContent) {
      setRenderedHtml('');
      return;
    }

    let isMounted = true;
    invoke<string>('parse_and_sanitize_markdown', { markdown: cleanedChangelog })
      .then((html) => {
        if (isMounted) setRenderedHtml(html);
      })
      .catch(console.error);

    return () => {
      isMounted = false;
    };
  }, [cleanedChangelog, hasContent]);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    el.addEventListener('click', handleExternalLinkClick);
    return () => el.removeEventListener('click', handleExternalLinkClick);
  }, []);

  return (
    <ModalWrapper
      onClose={onClose}
      title={`What's new in Chiri ${version}`}
      description={date ? `Released on ${formatDate(new Date(date), true, dateFormat)}` : undefined}
      zIndex="z-60"
      className="max-h-[80vh] max-w-2xl"
      headerRight={
        <ModalButton
          variant="secondary"
          size="icon"
          aria-label="View release on GitHub"
          onClick={() => {
            openUrl(`https://github.com/chiriapp/chiri/releases/tag/app-v${version}`);
          }}
          className="shrink-0"
        >
          <ExternalLink className="h-4 w-4" />
        </ModalButton>
      }
    >
      {hasContent ? (
        <ChangelogProse html={renderedHtml} contentRef={contentRef} />
      ) : (
        <p className="py-8 text-center text-sm text-surface-500 italic dark:text-surface-400">
          No changelog available for this release.
        </p>
      )}
    </ModalWrapper>
  );
};
