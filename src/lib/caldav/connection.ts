import { connectionStore } from '$context/connectionContext';
import { makeAbsoluteUrl } from '$lib/caldav/utils';
import type { CalDAVCredentials } from '$lib/tauri-http';
import { parseMultiStatus, propfind } from '$lib/tauri-http';
import type { Account, ServerType } from '$types';

interface ServerConfig {
  principalPath: (username: string) => string;
  calendarHomePath?: (username: string) => string;
}

export interface Connection {
  serverUrl: string;
  credentials: CalDAVCredentials;
  principalUrl: string;
  calendarHome: string;
  serverType: ServerType;
}

const CALDAV_PATH_PATTERNS = [
  /(?<!:)\/remote\.php\/dav.*$/i,
  /(?<!:)\/dav\.php.*$/i,
  /(?<!:)\/caldav(?:\/.*)?$/i,
  /(?<!:)\/\.well-known\/caldav.*$/i,
];

const SERVER_CONFIGS: Record<string, ServerConfig> = {
  rustical: {
    principalPath: (username) => `/caldav/principal/${username}/`,
  },
  radicale: {
    principalPath: (username) => `/${username}/`,
  },
  baikal: {
    principalPath: (username) => `/dav.php/principals/${username}/`,
    calendarHomePath: (username) => `/dav.php/calendars/${username}/`,
  },
  nextcloud: {
    principalPath: (username) => `/remote.php/dav/principals/users/${username}/`,
    calendarHomePath: (username) => `/remote.php/dav/calendars/${username}/`,
  },
};

export const handleCommonHttpErrors = (response: { status: number }, context = 'CalDAV') => {
  if (response.status === 429) throw new Error('Rate limit exceeded. Try again in a moment.');
  if (response.status === 401) throw new Error('Authentication failed. Check your credentials.');
  if (response.status === 403) throw new Error('Access forbidden. Check your permissions.');
  if (response.status === 404) throw new Error(`${context} not found at this URL.`);
  if (response.status >= 500)
    throw new Error(`Server error (${response.status}). Try again later.`);
};

const discoverPrincipal = async (davRootUrl: string, credentials: CalDAVCredentials) => {
  const propfindBody = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:current-user-principal/>
  </d:prop>
</d:propfind>`;

  const response = await propfind(davRootUrl, credentials, propfindBody, '0');
  handleCommonHttpErrors(response, 'CalDAV service');
  if (response.status !== 207) return null;

  parseMultiStatus(response.body);

  const match = response.body.match(
    /<[^:>]*:?current-user-principal[^>]*>\s*<[^:>]*:?href[^>]*>([^<]+)<\/[^:>]*:?href>/i,
  );
  return match ? match[1] : null;
};

const discoverCalendarHome = async (principalUrl: string, credentials: CalDAVCredentials) => {
  const propfindBody = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <c:calendar-home-set/>
  </d:prop>
</d:propfind>`;

  const response = await propfind(principalUrl, credentials, propfindBody, '0');
  handleCommonHttpErrors(response, 'CalDAV principal');
  if (response.status !== 207) return null;

  const match = response.body.match(
    /<[^:>]*:?calendar-home-set[^>]*>\s*<[^:>]*:?href[^>]*>([^<]+)<\/[^:>]*:?href>/i,
  );
  return match ? match[1] : null;
};

const PRINCIPAL_QUERY = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:current-user-principal/>
  </d:prop>
</d:propfind>`;

const PRINCIPAL_RE =
  /<[^:>]*:?current-user-principal[^>]*>\s*<[^:>]*:?href[^>]*>([^<]+)<\/[^:>]*:?href>/i;

/** Resolves the DAV root URL for generic/auto-detect servers, trying .well-known
 *  first and falling back to common paths if it returns 404. */
const resolveGenericDavRoot = async (
  baseUrl: string,
  credentials: CalDAVCredentials,
): Promise<{ davRootUrl: string; davRootBody: string | null }> => {
  const wellKnownUrl = `${baseUrl}/.well-known/caldav`;
  const wkResponse = await propfind(wellKnownUrl, credentials, PRINCIPAL_QUERY, '0');

  if (wkResponse.status !== 404) {
    handleCommonHttpErrors(wkResponse, 'CalDAV service');
    return {
      davRootUrl: wellKnownUrl,
      davRootBody: wkResponse.status === 207 ? wkResponse.body : null,
    };
  }

  // .well-known not configured — try common SabreDAV/Baikal paths
  for (const path of ['/dav.php', '/caldav']) {
    const fbUrl = `${baseUrl}${path}`;
    const fbResponse = await propfind(fbUrl, credentials, PRINCIPAL_QUERY, '0');
    if (fbResponse.status !== 404) {
      handleCommonHttpErrors(fbResponse, 'CalDAV service');
      return {
        davRootUrl: fbUrl,
        davRootBody: fbResponse.status === 207 ? fbResponse.body : null,
      };
    }
  }

  handleCommonHttpErrors(wkResponse, 'CalDAV service'); // throws 404
  throw new Error('CalDAV service not found at this URL.');
};

/** Discovers principalUrl + calendarHome for generic/auto-detect server types. */
const discoverGenericUrls = async (
  baseUrl: string,
  credentials: CalDAVCredentials,
): Promise<{ principalUrl: string; calendarHome: string }> => {
  const { davRootUrl, davRootBody } = await resolveGenericDavRoot(baseUrl, credentials);

  // Try to extract principal from the response we already have before issuing
  // another PROPFIND
  let discoveredPrincipal: string | null = davRootBody
    ? (davRootBody.match(PRINCIPAL_RE)?.[1] ?? null)
    : null;

  if (!discoveredPrincipal) {
    discoveredPrincipal = await discoverPrincipal(davRootUrl, credentials);
  }

  // Last resort: the multistatus href itself may be the DAV root
  if (!discoveredPrincipal && davRootBody) {
    const results = parseMultiStatus(davRootBody);
    if (results[0]?.href) {
      const davRoot = results[0].href.startsWith('http')
        ? results[0].href
        : new URL(results[0].href, baseUrl).toString();
      discoveredPrincipal = await discoverPrincipal(davRoot, credentials);
    }
  }

  if (!discoveredPrincipal) {
    throw new Error('Failed to discover CalDAV principal. Server may not support auto-discovery.');
  }

  const principalUrl = makeAbsoluteUrl(discoveredPrincipal, baseUrl);
  const discoveredCalendarHome = await discoverCalendarHome(principalUrl, credentials);

  if (!discoveredCalendarHome) {
    throw new Error('Failed to discover calendar-home-set. Server may not support CalDAV.');
  }

  return { principalUrl, calendarHome: makeAbsoluteUrl(discoveredCalendarHome, baseUrl) };
};

export const connect = async (
  accountId: string,
  serverUrl: string,
  username: string,
  password: string,
  serverType: ServerType = 'generic',
  calendarHomeUrl?: string,
  acceptInvalidCerts?: boolean,
): Promise<{ principalUrl: string; displayName: string; calendarHome: string }> => {
  const credentials: CalDAVCredentials = { username, password, acceptInvalidCerts };

  let baseUrl = serverUrl.replace(/\/$/, '');

  if (serverType === 'generic') {
    for (const pattern of CALDAV_PATH_PATTERNS) {
      if (pattern.test(baseUrl)) {
        baseUrl = baseUrl.replace(pattern, '');
        break;
      }
    }
  }

  let principalUrl: string;
  let calendarHome: string;

  // If a direct calendar home URL is provided, skip autodiscovery entirely
  if (calendarHomeUrl) {
    calendarHome = `${calendarHomeUrl.replace(/\/$/, '')}/`;
    principalUrl = calendarHome;
  } else {
    switch (serverType) {
      case 'rustical':
      case 'radicale':
      case 'baikal':
      case 'nextcloud': {
        const config = SERVER_CONFIGS[serverType];
        principalUrl = `${baseUrl}${config.principalPath(username)}`;
        calendarHome = config.calendarHomePath
          ? `${baseUrl}${config.calendarHomePath(username)}`
          : principalUrl;
        break;
      }
      case 'fastmail':
      case 'mailbox':
      case 'generic': {
        ({ principalUrl, calendarHome } = await discoverGenericUrls(baseUrl, credentials));
        break;
      }
      default:
        throw new Error(`Unknown server type: ${serverType}`);
    }
  }

  const propfindBody = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
  </d:prop>
</d:propfind>`;

  const response = await propfind(principalUrl, credentials, propfindBody, '0');

  if (response.status === 401) throw new Error('Authentication failed. Check your credentials.');
  if (response.status !== 207) throw new Error(`Failed to connect: HTTP ${response.status}`);

  const results = parseMultiStatus(response.body);
  const displayName = results[0]?.props.displayname ?? username;

  connectionStore.setConnection(accountId, {
    serverUrl: baseUrl,
    credentials,
    principalUrl,
    calendarHome,
    serverType,
  });

  return { principalUrl, displayName, calendarHome };
};

export const disconnect = (accountId: string): void => {
  connectionStore.deleteConnection(accountId);
};

export const isConnected = (accountId: string): boolean => {
  return connectionStore.hasConnection(accountId);
};

export const reconnect = async (account: Account): Promise<void> => {
  if (!account.serverUrl || !account.username || !account.password) {
    throw new Error('Missing account credentials');
  }
  await connect(
    account.id,
    account.serverUrl,
    account.username,
    account.password,
    account.serverType ?? 'generic',
    account.calendarHomeUrl,
    account.acceptInvalidCerts,
  );
};

export const getConnection = (accountId: string): Connection => {
  const conn = connectionStore.getConnection(accountId);
  if (!conn) throw new Error('Account not connected');
  return conn;
};
