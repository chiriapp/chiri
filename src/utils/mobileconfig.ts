/**
 * Utility functions for parsing Apple Configuration Profile (.mobileconfig) files
 */

import type { ServerType } from '$types';

export interface CalDAVConfig {
  accountName?: string;
  serverUrl?: string;
  username?: string;
  password?: string;
  principalUrl?: string;
  serverType?: ServerType;
}

/**
 * Detect server type based on hostname and principal URL
 *
 * Detection is based on CalDAVPrincipalURL patterns found in .mobileconfig files.
 * Each server type has a distinct URL structure verified from their source code:
 * - Baikal: /dav.php/principals/{username}/
 * - Radicale: /{username}/ (simple flat structure at root)
 * - Nextcloud: /remote.php/dav/principals/users/{username}/
 * - RustiCal: /caldav/principal/{username}/
 */
const detectServerType = (hostname: string | null, principalUrl: string | null): ServerType => {
  // Check hostname patterns first (managed services)
  if (hostname) {
    const host = hostname.toLowerCase();
    if (host.includes('fastmail.com')) return 'fastmail';
    if (host.includes('mailbox.org')) return 'mailbox';
    if (host.includes('migadu.com')) return 'migadu';
    if (host.includes('purelymail.com')) return 'purelymail';
    if (host.includes('runbox.com')) return 'runbox';
  }

  // Check principal URL path pattern
  if (principalUrl) {
    const path = principalUrl.toLowerCase();

    // RustiCal: /caldav/principal/{username}/
    if (path.includes('/caldav/principal/')) return 'rustical';

    // Nextcloud: /remote.php/dav/principals/users/{username}/
    // Also matches calendar home: /remote.php/dav/calendars/{username}/
    if (path.includes('/remote.php/dav/')) return 'nextcloud';

    // Baikal: /dav.php/principals/{username}/
    // Also matches calendars: /dav.php/calendars/{username}/
    if (path.includes('/dav.php/principals/')) return 'baikal';

    // Radicale: /{username}/ (simple flat structure)
    // Radicale uses a minimalist structure with users at root level
    const pathParts = path.split('/').filter((p) => p.length > 0);
    if (pathParts.length <= 2 && !path.includes('.php') && !path.includes('/dav/')) {
      return 'radicale';
    }
  }

  // Default to generic (auto-detect using .well-known/caldav)
  return 'generic';
};

/**
 * Parse an Apple Configuration Profile XML and extract CalDAV settings
 */
export const parseAppleConfigProfile = (xmlContent: string): CalDAVConfig | null => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    // Check for parse errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.error('XML parsing error:', parserError.textContent);
      return null;
    }

    // Find all dict elements in PayloadContent array
    const payloadContent = xmlDoc.querySelector('plist > dict > array');
    if (!payloadContent) {
      return null;
    }

    // Find the CalDAV payload dict
    const dicts = payloadContent.querySelectorAll('dict');
    let caldavDict: Element | null = null;

    for (const dict of Array.from(dicts)) {
      const keys = dict.querySelectorAll('key');
      for (const key of Array.from(keys)) {
        if (key.textContent === 'PayloadType') {
          const nextElement = key.nextElementSibling;
          if (
            nextElement?.tagName === 'string' &&
            nextElement.textContent === 'com.apple.caldav.account'
          ) {
            caldavDict = dict;
            break;
          }
        }
      }
      if (caldavDict) break;
    }

    if (!caldavDict) {
      return null;
    }

    // Helper to get value from plist dict
    const getValue = (dict: Element, keyName: string) => {
      const keys = dict.querySelectorAll('key');
      for (const key of Array.from(keys)) {
        if (key.textContent === keyName) {
          const nextElement = key.nextElementSibling;
          if (nextElement?.tagName === 'string') {
            return nextElement.textContent;
          }
          if (nextElement?.tagName === 'true') {
            return 'true';
          }
          if (nextElement?.tagName === 'false') {
            return 'false';
          }
        }
      }
      return null;
    };

    // Extract CalDAV configuration
    const hostname = getValue(caldavDict, 'CalDAVHostName');
    const username = getValue(caldavDict, 'CalDAVUsername');
    const password = getValue(caldavDict, 'CalDAVPassword');
    const principalUrl = getValue(caldavDict, 'CalDAVPrincipalURL');
    const useSSL = getValue(caldavDict, 'CalDAVUseSSL');
    const accountDescription = getValue(caldavDict, 'CalDAVAccountDescription');

    // Build server URL from hostname
    let serverUrl = '';
    if (hostname) {
      const protocol = useSSL === 'true' ? 'https' : 'http';
      serverUrl = `${protocol}://${hostname}`;
    }

    // If principalUrl is available, use it as the server URL
    if (principalUrl) {
      try {
        const url = new URL(principalUrl);
        serverUrl = `${url.protocol}//${url.host}`;
      } catch {
        // If parsing fails, keep the constructed serverUrl
      }
    }

    const serverType = detectServerType(hostname, principalUrl);

    return {
      accountName: accountDescription || username || undefined,
      serverUrl: serverUrl || undefined,
      username: username || undefined,
      password: password || undefined,
      principalUrl: principalUrl || undefined,
      serverType,
    };
  } catch (error) {
    console.error('Failed to parse Apple Configuration Profile:', error);
    return null;
  }
};
