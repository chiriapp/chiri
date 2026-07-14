import { DEFAULT_HTTP_PROXY_PORT, DEFAULT_SOCKS_PROXY_PORT } from '$constants/settings';

export const generateUUID = () => {
  return crypto.randomUUID();
};

export const normalizeProxyPort = (port: unknown) => {
  if (
    port == null ||
    port === DEFAULT_HTTP_PROXY_PORT ||
    port === String(DEFAULT_HTTP_PROXY_PORT) ||
    port === DEFAULT_SOCKS_PROXY_PORT ||
    port === String(DEFAULT_SOCKS_PROXY_PORT)
  ) {
    return '';
  }

  return String(port);
};

/**
 * pluralize a word based on count
 */
export const pluralize = (count: number, singular: string, plural?: string) => {
  return count === 1 ? singular : (plural ?? `${singular}s`);
};
