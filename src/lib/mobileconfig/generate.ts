import type { Account } from '$types';

const escapeXml = (value: string) =>
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
 */
export const generateMobileConfig = (account: Account, includePassword = false) => {
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
