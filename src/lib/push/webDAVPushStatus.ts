import type { Account } from '$types';
import type { WebDAVPushAccountDiagnostics } from '$types/push';

type WebDAVPushStatusTone = 'success' | 'warning' | 'muted' | 'info';
type WebDAVPushStatusIconType = 'ready' | 'off' | 'warning' | 'checking' | 'alert';

export interface WebDAVPushStatus {
  label: string;
  tone: WebDAVPushStatusTone;
  icon: WebDAVPushStatusIconType;
}

export const webdavPushToneClass: Record<WebDAVPushStatusTone, string> = {
  success: 'text-semantic-success',
  warning: 'text-semantic-warning',
  muted: 'text-surface-500 dark:text-surface-400',
  info: 'text-semantic-info',
};

export const getWebDAVPushStatus = (
  account: Account,
  providerAvailable: boolean | undefined,
  providerChecking: boolean,
  diagnostics: WebDAVPushAccountDiagnostics | undefined,
): WebDAVPushStatus => {
  const calendarCount = account.calendars.length;
  const supportedCount = account.calendars.filter((calendar) => calendar.pushSupported).length;

  if (calendarCount === 0) {
    return { label: 'No calendars', tone: 'muted', icon: 'off' };
  }

  if (supportedCount === 0) {
    return { label: 'Unsupported', tone: 'muted', icon: 'off' };
  }

  if (providerChecking) {
    return { label: 'Checking', tone: 'info', icon: 'checking' };
  }

  if (providerAvailable === false) {
    return { label: 'Provider unavailable', tone: 'warning', icon: 'off' };
  }

  if (!diagnostics) {
    return { label: 'Not registered', tone: 'warning', icon: 'off' };
  }

  if (diagnostics.registeredCalendars === 0) {
    return { label: 'Not registered', tone: 'warning', icon: 'off' };
  }

  if (diagnostics.listeningCalendars === 0) {
    return { label: 'Registered, not listening', tone: 'warning', icon: 'alert' };
  }

  if (diagnostics.listeningCalendars < diagnostics.registeredCalendars) {
    return { label: 'Partially listening', tone: 'warning', icon: 'warning' };
  }

  if (diagnostics.expiringSoonCalendars > 0) {
    return { label: 'Renewal due', tone: 'info', icon: 'ready' };
  }

  return { label: 'Listening', tone: 'success', icon: 'ready' };
};
