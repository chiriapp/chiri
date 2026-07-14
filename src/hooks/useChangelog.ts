import { useCallback, useState } from 'react';
import { fetchReleaseNotes } from '$utils/meta';

interface ChangelogData {
  version: string;
  body: string;
  date?: string;
}

export const useChangelog = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [changelogData, setChangelogData] = useState<ChangelogData | null>(null);

  const openChangelog = useCallback(
    async (version: string, prefetchedBody?: string, prefetchedDate?: string) => {
      if (prefetchedBody !== undefined) {
        setChangelogData({ version, body: prefetchedBody, date: prefetchedDate });
        return;
      }
      setIsLoading(true);
      const releaseData = await fetchReleaseNotes(version);
      setIsLoading(false);
      setChangelogData({ version, body: releaseData.body, date: releaseData.date });
    },
    [],
  );

  const closeChangelog = useCallback(() => setChangelogData(null), []);

  return { openChangelog, closeChangelog, isLoading, changelogData };
};
