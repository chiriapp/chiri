import {
  CALDAV_SERVER_WARNINGS,
  type CalDAVWarning,
  UNSUPPORTED_CALDAV_WARNINGS,
  type UnsupportedCalDAVProvider,
} from '$constants/caldav';
import type { ConfirmOptions } from '$context/confirmDialogContext';
import type { ServerType } from '$types';

export const isVikunjaServer = (calendarHome: string) => {
  return calendarHome.includes('/dav/projects');
};

const getUnsupportedProvider = (serverUrl: string): UnsupportedCalDAVProvider | null => {
  try {
    const hostname = new URL(serverUrl).hostname.toLowerCase();
    if (
      hostname === 'caldav.icloud.com' ||
      hostname.endsWith('.caldav.icloud.com') ||
      /^p\d+-caldav\.icloud\.com$/.test(hostname)
    ) {
      return 'icloud';
    }
    if (hostname === 'apidata.googleusercontent.com' || hostname === 'calendar.google.com') {
      return 'google';
    }
  } catch {
    return null;
  }

  return null;
};

export const getUrlWarning = (serverUrl: string): CalDAVWarning | null => {
  const provider = getUnsupportedProvider(serverUrl);
  if (!provider) return null;

  return UNSUPPORTED_CALDAV_WARNINGS[provider];
};

export const getServerWarning = (
  serverType: ServerType,
  options?: { calendarHome?: string },
): CalDAVWarning | null => {
  const { calendarHome } = options ?? {};
  if (serverType === 'vikunja' || (calendarHome && isVikunjaServer(calendarHome))) {
    return CALDAV_SERVER_WARNINGS.vikunja ?? null;
  }

  return CALDAV_SERVER_WARNINGS[serverType] ?? null;
};

export const toConfirmOptions = (warning: CalDAVWarning): ConfirmOptions => ({
  title: warning.title,
  message: warning.message,
  confirmLabel: warning.confirmLabel,
  cancelLabel: 'Cancel',
  destructive: true,
  delayConfirmSeconds: warning.delayConfirmSeconds,
});
