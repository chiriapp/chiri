import type { CalDAVClient } from '$lib/caldav';
import type { CalendarDiscoveryDiagnostics } from '$lib/caldav/calendars';
import { getErrorMessage, isCertError } from '$lib/http';
import type { ServerType } from '$types';

export interface CalDAVSetupError {
  title: string;
  message: string;
  hint?: string;
  detail?: string;
}

export interface CalDAVSetupNotice {
  title: string;
  message: string;
}

const HTTP_STATUS_RE = /HTTP\s+(\d{3})/i;
const VTODO_CREATION_UNSUPPORTED_PREFIX =
  'VTODO calendar creation is not supported. Chiri connected to the account, but could not create a task calendar.';

const getVtodoSetupErrorInfo = (raw: string, lower: string): CalDAVSetupError | null => {
  if (lower.includes('vtodo calendar creation is not supported')) {
    const detail = raw.replace(VTODO_CREATION_UNSUPPORTED_PREFIX, '').trim();

    return {
      title: 'Task calendars are not supported',
      message:
        'Chiri connected successfully, but this account could not create a VTODO/task calendar.',
      hint: 'Use a CalDAV account that supports task calendars, or create/enable a task-capable calendar on the server before adding it to Chiri.',
      detail: detail || raw,
    };
  }

  if (lower.includes('could create a vtodo calendar') && lower.includes('could not clean up')) {
    return {
      title: 'Temporary calendar cleanup failed',
      message:
        'Chiri verified that task calendar creation works, but could not delete the temporary test calendar.',
      hint: 'Delete the temporary Chiri VTODO capability check calendar on the server, then try again.',
      detail: raw,
    };
  }

  return null;
};

export const getSetupErrorInfo = (
  error: unknown,
  fallback: string,
  serverType: ServerType,
  serverUrl: string,
): CalDAVSetupError => {
  const detail = getErrorMessage(error);
  const raw = detail === 'Unknown error' ? fallback : detail;
  const lower = raw.toLowerCase();
  const status = raw.match(HTTP_STATUS_RE)?.[1];
  const serverLabel = serverType === 'generic' ? 'CalDAV' : serverType;
  const trimmedServerUrl = serverUrl.trim();
  const vtodoSetupError = getVtodoSetupErrorInfo(raw, lower);

  if (vtodoSetupError) {
    return vtodoSetupError;
  }

  if (lower.includes('password is required') || lower.includes('server url and username')) {
    return {
      title: 'Missing account details',
      message: raw,
      hint: 'Fill in the required fields, then try testing the connection again.',
    };
  }

  if (lower.includes('authentication failed') || status === '401') {
    return {
      title: 'Authentication failed',
      message: 'Chiri reached the server, but the username or password was rejected.',
      hint:
        serverType === 'fastmail'
          ? 'Fastmail requires an app password with CalDAV access, not your normal account password.'
          : 'Check the username and password. If your account uses 2FA, you may need an app password.',
      detail: raw,
    };
  }

  if (lower.includes('forbidden') || status === '403') {
    return {
      title: 'Access forbidden',
      message:
        'Chiri reached the server, but this account is not allowed to access that CalDAV path.',
      hint: 'Check account permissions, sharing settings, or the advanced Principal / Calendar Home URL fields.',
      detail: raw,
    };
  }

  if (lower.includes('not found') || status === '404') {
    return {
      title: 'CalDAV endpoint not found',
      message: `Chiri reached ${trimmedServerUrl || 'the server'}, but did not find ${serverLabel} CalDAV there.`,
      hint:
        serverType === 'nextcloud'
          ? 'For Nextcloud, use the base server URL such as http://localhost:8081. Chiri adds /remote.php/dav/ automatically.'
          : 'Check the server URL. For unusual setups, expand Advanced and provide the Principal URL or Calendar Home URL.',
      detail: raw,
    };
  }

  if (lower.includes('rate limit') || status === '429') {
    return {
      title: 'Too many requests',
      message: 'The server is rate limiting connection attempts.',
      hint: 'Wait a moment before trying again.',
      detail: raw,
    };
  }

  if (status && Number(status) >= 500) {
    return {
      title: 'Server error',
      message: `The CalDAV server responded with HTTP ${status}.`,
      hint: 'The server may be temporarily unavailable or misconfigured. Check the server logs if you manage it.',
      detail: raw,
    };
  }

  if (
    lower.includes('server unreachable') ||
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('connection refused') ||
    lower.includes('error sending request for url') ||
    lower.includes('timed out') ||
    lower.includes('timeout')
  ) {
    return {
      title: 'Server unreachable',
      message: `Chiri could not reach ${trimmedServerUrl || 'the server URL'}.`,
      hint: 'Make sure the server is running, the URL is correct, and nothing like a VPN, firewall, or proxy is blocking it.',
      detail: raw,
    };
  }

  if (isCertError(raw)) {
    return {
      title: 'Certificate not trusted',
      message: 'The server certificate could not be verified.',
      hint: 'If this is your own server with a self-signed/private certificate, choose to trust it when prompted.',
      detail: raw,
    };
  }

  if (lower.includes('failed to discover') || lower.includes('auto-discovery')) {
    return {
      title: 'CalDAV discovery failed',
      message:
        'Chiri reached the server, but could not discover the CalDAV principal or calendar home.',
      hint: 'Try choosing the exact server type instead of Generic, or expand Advanced and enter the Principal URL / Calendar Home URL.',
      detail: raw,
    };
  }

  if (lower.includes('failed to fetch calendars')) {
    return {
      title: 'Could not list calendars',
      message: 'Chiri connected to the account, but could not read the calendar list.',
      hint: 'Check whether the account has task-capable calendars and permission to list them.',
      detail: raw,
    };
  }

  if (lower.includes('invalid caldav xml') || lower.includes('invalid caldav multistatus')) {
    return {
      title: 'Invalid CalDAV response',
      message: 'Chiri reached the server, but it returned malformed WebDAV XML.',
      hint: 'This usually means the URL points to a non-CalDAV endpoint, a proxy error page, or a broken server response.',
      detail: raw,
    };
  }

  return {
    title: fallback,
    message: raw,
    hint: 'Check the fields above and try connecting again. The technical detail may help identify the failing CalDAV step.',
    detail: raw,
  };
};

export const getSetupNotice = (
  diagnostics: CalendarDiscoveryDiagnostics,
  canCreateVtodoCalendar: boolean,
): CalDAVSetupNotice | null => {
  if (diagnostics.includedCalendarCount > 0 || !canCreateVtodoCalendar) {
    return null;
  }

  const calendarList =
    diagnostics.nonVtodoCalendarNames.length > 0
      ? ` (${diagnostics.nonVtodoCalendarNames.join(', ')})`
      : '';
  const skippedCalendars =
    diagnostics.nonVtodoCalendarCount > 0
      ? `Chiri ignored ${diagnostics.nonVtodoCalendarCount} event-only ${diagnostics.nonVtodoCalendarCount === 1 ? 'calendar' : 'calendars'}${calendarList}.`
      : 'Chiri did not find any calendars on this account.';

  return {
    title: 'No task calendars found',
    message: `${skippedCalendars} It can still be added because Chiri verified that this account can create VTODO/task calendars.`,
  };
};

export const probeSetupVtodoCreationIfNeeded = async (
  client: CalDAVClient,
  diagnostics: CalendarDiscoveryDiagnostics,
  enforceVapid = false,
) => {
  if (diagnostics.includedCalendarCount > 0) {
    return false;
  }

  try {
    await client.probeVtodoCalendarCreation(enforceVapid);
    return true;
  } catch (error) {
    const detail = getErrorMessage(error);
    if (detail.includes('could not clean up the temporary test calendar')) {
      throw error;
    }

    throw new Error(
      `VTODO calendar creation is not supported. Chiri connected to the account, but could not create a task calendar. ${detail}`,
    );
  }
};
