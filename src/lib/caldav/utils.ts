import { loggers } from '$lib/logger';

export const log = loggers.caldav;

export const cleanEtag = (etag: string | null | undefined) => {
  return etag?.replace(/"/g, '') ?? '';
};

export const normalizeUrl = (url: string) => {
  return url.replace(/\/$/, '');
};

export const makeAbsoluteUrl = (href: string, baseUrl: string) => {
  return href.startsWith('http') ? href : new URL(href, baseUrl).toString();
};
