import packageJson from '../../package.json';

interface AppInfo {
  version: string;
  description: string;
  author: string;
}

const GITHUB_REPO = 'chiriapp/chiri';

export const fetchReleaseNotes = async (version: string) => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/app-v${version}`,
      { headers: { Accept: 'application/vnd.github.v3+json' } },
    );
    if (!response.ok) return { body: '' };
    const release = (await response.json()) as { body?: string; published_at?: string };
    return { body: release.body ?? '', date: release.published_at };
  } catch {
    return { body: '' };
  }
};

/**
 * Get application information from package.json
 */
export const getAppInfo = () => {
  const pkg = packageJson satisfies AppInfo;

  return {
    version: pkg.version,
    name: 'Chiri',
    description: pkg.description,
    author: pkg.author,
  } as const;
};
