/**
 * Utility functions for parsing Apple Configuration Profile (.mobileconfig) files
 */

export interface CalDAVConfig {
  accountName?: string;
  serverUrl?: string;
  username?: string;
  password?: string;
  principalUrl?: string;
}

/**
 * Parse an Apple Configuration Profile XML and extract CalDAV settings
 */
export function parseAppleConfigProfile(xmlContent: string): CalDAVConfig | null {
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
    const getValue = (dict: Element, keyName: string): string | null => {
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

    return {
      accountName: accountDescription || username || undefined,
      serverUrl: serverUrl || undefined,
      username: username || undefined,
      password: password || undefined,
      principalUrl: principalUrl || undefined,
    };
  } catch (error) {
    console.error('Failed to parse Apple Configuration Profile:', error);
    return null;
  }
}
