/**
 * Utility functions for parsing and generating Apple Configuration Profile (.mobileconfig) files
 */

import type { Account, ServerType } from '$types';

export interface MobileConfigCalDAVSettings {
  accountName?: string;
  serverUrl?: string;
  username?: string;
  password?: string;
  principalUrl?: string;
  serverType?: ServerType;
}

export type MobileConfigParseFailureReason =
  | 'invalid-xml'
  | 'missing-payload-content'
  | 'missing-caldav-payload'
  | 'unexpected-error';

export type MobileConfigParseResult =
  | { ok: true; config: MobileConfigCalDAVSettings }
  | { ok: false; reason: MobileConfigParseFailureReason };

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
    let pathname = principalUrl.toLowerCase();
    try {
      pathname = new URL(principalUrl).pathname.toLowerCase();
    } catch {
      // already relative; use as-is
    }

    // RustiCal: /caldav/principal/{username}/
    if (pathname.includes('/caldav/principal/')) return 'rustical';

    // Nextcloud: /remote.php/dav/principals/users/{username}/
    // Also matches calendar home: /remote.php/dav/calendars/{username}/
    if (pathname.includes('/remote.php/dav/')) return 'nextcloud';

    // Baikal: /dav.php/principals/{username}/
    // Also matches calendars: /dav.php/calendars/{username}/
    if (pathname.includes('/dav.php/principals/')) return 'baikal';

    // Radicale: /{username}/ (simple flat structure)
    // Radicale uses a minimalist structure with users at root level
    const pathParts = pathname.split('/').filter((p) => p.length > 0);
    if (pathParts.length <= 2 && !pathname.includes('.php') && !pathname.includes('/dav/')) {
      return 'radicale';
    }
  }

  // Default to generic (auto-detect using .well-known/caldav)
  return 'generic';
};

/**
 * Parse an Apple Configuration Profile XML and extract CalDAV settings.
 */
export const parseAppleConfigProfileResult = (xmlContent: string): MobileConfigParseResult => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    // DOMParser reports invalid XML by adding a parsererror element instead of throwing.
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      return { ok: false, reason: 'invalid-xml' };
    }

    // Find all dict elements in PayloadContent array
    const payloadContent = xmlDoc.querySelector('plist > dict > array');
    if (!payloadContent) {
      return { ok: false, reason: 'missing-payload-content' };
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
      return { ok: false, reason: 'missing-caldav-payload' };
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
      ok: true,
      config: {
        accountName: accountDescription || username || undefined,
        serverUrl: serverUrl || undefined,
        username: username || undefined,
        password: password || undefined,
        principalUrl: principalUrl || undefined,
        serverType,
      },
    };
  } catch {
    return { ok: false, reason: 'unexpected-error' };
  }
};

/**
 * Parse an Apple Configuration Profile XML and extract CalDAV settings.
 */
export const parseAppleConfigProfile = (xmlContent: string): MobileConfigCalDAVSettings | null => {
  const result = parseAppleConfigProfileResult(xmlContent);

  return result.ok ? result.config : null;
};

/**
 * Escape a string for safe inclusion inside an XML plist <string> element.
 */
const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Generate an Apple Configuration Profile (.mobileconfig) XML for a CalDAV account.
 *
 * The generated profile can be opened directly on iPhone, iPad, or macOS
 * to add the CalDAV account without manual configuration.
 *
 * @param account - The Account object whose `caldav` config will be exported
 * @param includePassword - When true, embeds the cleartext password in the profile
 * @returns A string containing the full .mobileconfig XML
 */
export const generateMobileConfig = (account: Account, includePassword = false): string => {
  const caldav = account.caldav;
  if (!caldav) throw new Error('Account has no CalDAV configuration');

  const profileUuid = crypto.randomUUID().toUpperCase();
  const payloadUuid = crypto.randomUUID().toUpperCase();

  let serverHostname = '';
  let useSSL = true;

  try {
    const url = new URL(caldav.serverUrl);
    serverHostname = url.hostname + (url.port ? `:${url.port}` : '');
    useSSL = url.protocol === 'https:';
  } catch {
    // Fallback: use the raw serverUrl as hostname
    serverHostname = caldav.serverUrl;
  }

  const accountDescription = escapeXml(account.name);
  const hostname = escapeXml(serverHostname);
  const username = escapeXml(caldav.username);
  const principalUrl = caldav.principalUrl ? escapeXml(caldav.principalUrl) : null;
  const password =
    includePassword && caldav.password
      ? `\t\t\t<key>CalDAVPassword</key>\n\t\t\t<string>${escapeXml(caldav.password)}</string>\n`
      : '';

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    '<dict>',
    '\t<key>PayloadContent</key>',
    '\t<array>',
    '\t\t<dict>',
    '\t\t\t<key>CalDAVAccountDescription</key>',
    `\t\t\t<string>${accountDescription}</string>`,
    '\t\t\t<key>CalDAVHostName</key>',
    `\t\t\t<string>${hostname}</string>`,
    '\t\t\t<key>CalDAVUseSSL</key>',
    `\t\t\t<${useSSL ? 'true' : 'false'}/>`,
    '\t\t\t<key>CalDAVUsername</key>',
    `\t\t\t<string>${username}</string>`,
    password.trimEnd(),
    principalUrl
      ? `\t\t\t<key>CalDAVPrincipalURL</key>\n\t\t\t<string>${principalUrl}</string>`
      : null,
    '\t\t\t<key>PayloadDescription</key>',
    '\t\t\t<string>CalDAV Account</string>',
    '\t\t\t<key>PayloadDisplayName</key>',
    `\t\t\t<string>${accountDescription}</string>`,
    '\t\t\t<key>PayloadIdentifier</key>',
    `\t\t\t<string>com.apple.caldav.account.${payloadUuid}</string>`,
    '\t\t\t<key>PayloadType</key>',
    '\t\t\t<string>com.apple.caldav.account</string>',
    '\t\t\t<key>PayloadUUID</key>',
    `\t\t\t<string>${payloadUuid}</string>`,
    '\t\t\t<key>PayloadVersion</key>',
    '\t\t\t<integer>1</integer>',
    '\t\t</dict>',
    '\t</array>',
    '\t<key>PayloadDescription</key>',
    `\t<string>CalDAV account configuration for ${accountDescription}</string>`,
    '\t<key>PayloadDisplayName</key>',
    `\t<string>${accountDescription} CalDAV</string>`,
    '\t<key>PayloadIdentifier</key>',
    `\t<string>com.chiri.caldav.${profileUuid}</string>`,
    '\t<key>PayloadRemovalDisallowed</key>',
    '\t<false/>',
    '\t<key>PayloadType</key>',
    '\t<string>Configuration</string>',
    '\t<key>PayloadUUID</key>',
    `\t<string>${profileUuid}</string>`,
    '\t<key>PayloadVersion</key>',
    '\t<integer>1</integer>',
    '</dict>',
    '</plist>',
  ]
    .filter((line) => line !== null)
    .join('\n');
};
