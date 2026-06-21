export const MOBILE_CONFIG_EXTENSION = '.mobileconfig';
export const MOBILE_CONFIG_MIME_TYPE = 'application/x-apple-aspen-config';
export const MOBILE_CONFIG_MAX_BYTES = 5 * 1024 * 1024;

export const isMobileConfigFileName = (fileName: string) =>
  fileName.toLowerCase().endsWith(MOBILE_CONFIG_EXTENSION);
