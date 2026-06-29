import { loggers } from '$lib/logger';

export const log = loggers.caldav;

export const cleanEtag = (etag: string | null | undefined) => {
  return etag?.replace(/"/g, '') ?? '';
};

export const normalizeUrl = (url: string) => {
  return url.replace(/\/$/, '');
};

export const hasHttpUrlScheme = (url: string) => {
  return /^https?:\/\//i.test(url.trim());
};

export const makeAbsoluteUrl = (href: string, baseUrl: string) => {
  return href.startsWith('http') ? href : new URL(href, baseUrl).toString();
};

export const isValidPrincipalUrlOverride = (value: string, baseUrl: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return true;

  if (trimmedValue.startsWith('//')) return false;

  try {
    const url = hasHttpUrlScheme(trimmedValue)
      ? new URL(trimmedValue)
      : new URL(trimmedValue, baseUrl);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (url.username || url.password) return false;

    return true;
  } catch {
    return false;
  }
};
