import { openUrl } from '@tauri-apps/plugin-opener';
import { DEFAULT_HTTP_PROXY_PORT, DEFAULT_SOCKS_PROXY_PORT } from '$constants/settings';

export const generateUUID = () => {
  return crypto.randomUUID();
};

/**
 * intercept clicks on links inside rendered HTML and open them in the system browser
 */
export const handleExternalLinkClick = (e: MouseEvent) => {
  const anchor = (e.target as HTMLElement).closest('a');
  if (anchor?.href) {
    e.preventDefault();
    openUrl(anchor.href);
  }
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

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const HTML_TAG_RE = /<[^>]+>/g;
const WHITESPACE_RE = /\s+/g;

/**
 * flatten an HTML body (such as a server error page) into a single line of text
 */
export const stripHtmlTags = (value: string): string =>
  value.replace(HTML_TAG_RE, ' ').replace(WHITESPACE_RE, ' ').trim();

export const base64UrlEncode = (data: Uint8Array) => {
  const binary = Array.from(data, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
