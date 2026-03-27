import packageJson from '../../package.json';

export interface AppInfo {
  version: string;
  description: string;
  author: string;
}

const GITHUB_REPO = 'SapphoSys/chiri';

export const fetchReleaseNotes = async (version: string) => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/app-v${version}`,
      { headers: { Accept: 'application/vnd.github.v3+json' } },
    );
    if (!response.ok) return '';
    const release = (await response.json()) as { body?: string };
    return release.body ?? '';
  } catch {
    return '';
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
