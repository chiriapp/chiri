import { useCallback, useState } from 'react';
import type { ChangelogData } from '$types/changelog';
import { renderChangelogHtml } from '$utils/markdown';
import { fetchReleaseNotes } from '$utils/meta';

interface PrefetchedRelease {
  body: string;
  date?: string;
}

export const useChangelog = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [changelogData, setChangelogData] = useState<ChangelogData | null>(null);

  const openChangelog = useCallback(async (version: string, prefetched?: PrefetchedRelease) => {
    setIsLoading(true);

    try {
      const { body, date } = prefetched ?? (await fetchReleaseNotes(version));
      const html = await renderChangelogHtml(body).catch((error) => {
        console.error('failed to render changelog:', error);
        return '';
      });

      setChangelogData({ version, html, date });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const closeChangelog = useCallback(() => setChangelogData(null), []);

  return { openChangelog, closeChangelog, isLoading, changelogData };
};
