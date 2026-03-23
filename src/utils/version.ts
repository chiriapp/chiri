import packageJson from '../../package.json';

export interface AppInfo {
  version: string;
  description: string;
  author: string;
}

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
