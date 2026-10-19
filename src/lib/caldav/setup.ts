import type { CalDAVClient } from '$lib/caldav';
import type { CalendarDiscoveryDiagnostics } from '$lib/caldav/calendars';
import type { HttpRequestContext } from '$lib/http';
import { DetailedError, getErrorMessage, isCertError } from '$lib/http';
import type { ServerType } from '$types/account';

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

export type CalDAVErrorContext = 'setup' | 'account-sync' | 'calendar-sync';

const HTML_TAG_RE = /<[^>]+>/g;
const WHITESPACE_RE = /\s+/g;

const stripHtmlTags = (value: string): string =>
  value.replace(HTML_TAG_RE, ' ').replace(WHITESPACE_RE, ' ').trim();

const isErrorLike = (value: unknown): value is { message: string } =>
  value !== null &&
  typeof value === 'object' &&
  'message' in value &&
  typeof value.message === 'string';

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

const extractErrorDetails = (error: unknown, fallback: string) => {
  const rawDetail =
    error instanceof DetailedError
      ? error.detail
      : error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : fallback;
  const normalized = getErrorMessage(error);
  const normalizedMessage = normalized === 'Unknown error' ? fallback : normalized;
  const status = (normalizedMessage.match(HTTP_STATUS_RE) ?? rawDetail.match(HTTP_STATUS_RE))?.[1];
  return { rawDetail, normalizedMessage, status };
};

const getSetupContextErrorInfo = (
  normalizedMessage: string,
  lower: string,
  rawDetail: string,
): CalDAVSetupError | null => {
  const vtodoSetupError = getVtodoSetupErrorInfo(normalizedMessage, lower);
  if (vtodoSetupError) return vtodoSetupError;

  if (lower.includes('connection test is already in progress')) {
    return {
      title: 'Connection test already in progress',
      message: normalizedMessage,
      hint: 'Wait for the current test to finish before trying again.',
      detail: rawDetail,
    };
  }

  if (lower.includes('password is required') || lower.includes('server url and username')) {
    return {
      title: 'Missing account details',
      message: normalizedMessage,
      hint: 'Fill in the required fields, then try testing the connection again.',
    };
  }

  return null;
};

const getAuthenticationErrorInfo = (
  lower: string,
  status: string | undefined,
  serverType: ServerType,
  rawDetail: string,
): CalDAVSetupError | null => {
  if (!lower.includes('authentication failed') && status !== '401') return null;

  return {
    title: 'Authentication failed',
    message: 'Chiri reached the server, but the username or password was rejected.',
    hint:
      serverType === 'fastmail'
        ? 'Fastmail requires an app password with CalDAV access, not your normal account password.'
        : 'Check the username and password. If your account uses 2FA, you may need an app password.',
    detail: rawDetail,
  };
};

const getServerResponseErrorInfo = (
  lower: string,
  status: string | undefined,
  serverType: ServerType,
  serverUrl: string,
  context: CalDAVErrorContext,
  rawDetail: string,
): CalDAVSetupError | null => {
  if (lower.includes('forbidden') || status === '403') {
    return {
      title: 'Access forbidden',
      message:
        'Chiri reached the server, but this account is not allowed to access that CalDAV path.',
      hint:
        context === 'calendar-sync'
          ? 'Check that this account still has permission to access this calendar.'
          : 'Check account permissions, sharing settings, or the advanced Principal / Calendar Home URL fields.',
      detail: rawDetail,
    };
  }

  const isCalendarMissing =
    context === 'calendar-sync' &&
    (status === '404' ||
      lower.includes('calendar not found') ||
      lower.includes('calendar unavailable'));
  const isEndpointMissing =
    context !== 'calendar-sync' && (lower.includes('not found') || status === '404');
  if (isCalendarMissing || isEndpointMissing) {
    return {
      title: context === 'calendar-sync' ? 'Calendar unavailable' : 'CalDAV endpoint not found',
      message:
        context === 'calendar-sync'
          ? 'Chiri could not find this calendar on the server.'
          : `Chiri reached ${serverUrl.trim() || 'the server'}, but did not find ${serverType === 'generic' ? 'CalDAV' : serverType} CalDAV there.`,
      hint:
        context === 'calendar-sync'
          ? 'Check that this calendar still exists on the server and that its URL is current.'
          : serverType === 'nextcloud'
            ? 'For Nextcloud, use the base server URL such as http://localhost:8081. Chiri adds /remote.php/dav/ automatically.'
            : 'Check the server URL. For unusual setups, expand Advanced and provide the Principal URL or Calendar Home URL.',
      detail: rawDetail,
    };
  }

  if (lower.includes('rate limit') || status === '429') {
    return {
      title: 'Too many requests',
      message: 'The server is rate limiting connection attempts.',
      hint: 'Wait a moment before trying again.',
      detail: rawDetail,
    };
  }

  if (status && Number(status) >= 500) {
    return {
      title: 'Server error',
      message: `The CalDAV server responded with HTTP ${status}.`,
      hint: 'The server may be temporarily unavailable or misconfigured. Check the server logs if you manage it.',
      detail: rawDetail,
    };
  }

  return null;
};

const getRequestErrorInfo = (
  normalizedMessage: string,
  lower: string,
  serverUrl: string,
  fallback: string,
  context: CalDAVErrorContext,
  rawDetail: string,
): CalDAVSetupError | null => {
  if (lower.includes('could not connect to ')) {
    return {
      title: fallback,
      message: normalizedMessage,
      hint: 'Verify the URL, port, and that the server is running.',
      detail: rawDetail,
    };
  }

  if (lower.includes('failed to fetch calendars')) {
    return {
      title: 'Could not list calendars',
      message: 'Chiri connected to the account, but could not read the calendar list.',
      hint: 'Check whether the account has task-capable calendars and permission to list them.',
      detail: rawDetail,
    };
  }

  const isFetchNetworkFailure =
    lower === 'failed to fetch' ||
    (context !== 'calendar-sync' && lower.includes('failed to fetch'));
  if (
    lower.includes('server unreachable') ||
    isFetchNetworkFailure ||
    lower.includes('network') ||
    lower.includes('connection refused') ||
    lower.includes('error sending request for url') ||
    lower.includes('timed out') ||
    lower.includes('timeout')
  ) {
    return {
      title: 'Server unreachable',
      message: `Chiri could not reach ${serverUrl.trim() || 'the server URL'}.`,
      hint: 'Make sure the server is running, the URL is correct, and nothing like a VPN, firewall, or proxy is blocking it.',
      detail: rawDetail,
    };
  }

  if (isCertError(normalizedMessage)) {
    return {
      title: 'Certificate not trusted',
      message: 'The server certificate could not be verified.',
      hint: 'If this is your own server with a self-signed/private certificate, choose to trust it when prompted.',
      detail: rawDetail,
    };
  }

  if (lower.includes('failed to discover') || lower.includes('auto-discovery')) {
    return {
      title: 'CalDAV discovery failed',
      message:
        'Chiri reached the server, but could not discover the CalDAV principal or calendar home.',
      hint: 'Try choosing the exact server type instead of Generic, or expand Advanced and enter the Principal URL / Calendar Home URL.',
      detail: rawDetail,
    };
  }

  if (lower.includes('invalid caldav xml') || lower.includes('invalid caldav multistatus')) {
    return {
      title: 'Invalid CalDAV response',
      message: 'Chiri reached the server, but it returned malformed WebDAV XML.',
      hint: 'This usually means the URL points to a non-CalDAV endpoint, a proxy error page, or a broken server response.',
      detail: rawDetail,
    };
  }

  return null;
};

export const getCalDAVErrorInfo = (
  error: unknown,
  fallback: string,
  serverType: ServerType,
  serverUrl: string,
  context: CalDAVErrorContext = 'setup',
): CalDAVSetupError => {
  const { rawDetail, normalizedMessage, status } = extractErrorDetails(error, fallback);
  const lower = normalizedMessage.toLowerCase();

  if (context === 'setup') {
    const setupError = getSetupContextErrorInfo(normalizedMessage, lower, rawDetail);
    if (setupError) return setupError;
  }

  const authenticationError = getAuthenticationErrorInfo(lower, status, serverType, rawDetail);
  if (authenticationError) return authenticationError;

  const serverError = getServerResponseErrorInfo(
    lower,
    status,
    serverType,
    serverUrl,
    context,
    rawDetail,
  );
  if (serverError) return serverError;

  const requestError = getRequestErrorInfo(
    normalizedMessage,
    lower,
    serverUrl,
    fallback,
    context,
    rawDetail,
  );
  if (requestError) return requestError;

  return {
    title: fallback,
    message: normalizedMessage,
    hint: context === 'setup' ? 'Review the account details and try again.' : undefined,
    detail: rawDetail,
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
  context?: HttpRequestContext,
) => {
  if (diagnostics.includedCalendarCount > 0) {
    return false;
  }

  try {
    await client.probeVtodoCalendarCreation(enforceVapid, context);
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

export const toCalDAVSetupError = (
  title: string,
  error: unknown,
  hint?: string,
): CalDAVSetupError => {
  if (isErrorLike(error)) {
    return {
      title,
      message: stripHtmlTags(error.message),
      hint: hint ?? ('hint' in error && typeof error.hint === 'string' ? error.hint : undefined),
      detail: 'detail' in error && typeof error.detail === 'string' ? error.detail : undefined,
    };
  }

  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error) || 'An unexpected error occurred. Please try again.';
  const cleaned = stripHtmlTags(raw);
  return {
    title,
    message: cleaned || 'An unexpected error occurred. Please try again.',
    hint,
  };
};
