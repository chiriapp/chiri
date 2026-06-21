const plist = (payloadContent: string) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    ${payloadContent}
  </array>
</dict>
</plist>`;

export const caldavPayload = (fields: Record<string, string | number | boolean>) => {
  const entries = Object.entries(fields)
    .map(([key, value]) => {
      if (typeof value === 'boolean') {
        return `<key>${key}</key><${value ? 'true' : 'false'}/>`;
      }
      if (typeof value === 'number') {
        return `<key>${key}</key><integer>${value}</integer>`;
      }
      return `<key>${key}</key><string>${value}</string>`;
    })
    .join('\n');

  return `<dict>
    <key>PayloadType</key>
    <string>com.apple.caldav.account</string>
    ${entries}
  </dict>`;
};

export const mobileConfigFixtures = {
  malformed: 'not xml at all',
  missingPayloadContent: '<?xml version="1.0"?><plist><dict></dict></plist>',
  withoutCalDAV: plist(`<dict>
    <key>PayloadType</key>
    <string>com.apple.mail.managed</string>
  </dict>`),
  typical: plist(
    caldavPayload({
      CalDAVHostName: 'caldav.example.test',
      CalDAVUsername: 'alice',
      CalDAVPassword: 'app-password',
      CalDAVUseSSL: true,
      CalDAVAccountDescription: 'Example Calendar',
    }),
  ),
  customPort: plist(
    caldavPayload({
      CalDAVHostName: 'calendar.example.test',
      CalDAVPort: 8443,
      CalDAVUsername: 'alice',
      CalDAVUseSSL: true,
    }),
  ),
  implicitSSL: plist(
    caldavPayload({
      CalDAVHostName: 'calendar.example.test',
      CalDAVUsername: 'alice',
    }),
  ),
  explicitHTTP: plist(
    caldavPayload({
      CalDAVHostName: 'localhost',
      CalDAVPort: 5232,
      CalDAVUseSSL: false,
    }),
  ),
  relativePrincipal: plist(
    caldavPayload({
      CalDAVHostName: 'calendar.example.test',
      CalDAVUsername: 'alice',
      CalDAVUseSSL: true,
      CalDAVPrincipalURL: '/principals/alice/',
    }),
  ),
  multipleCalDAV: plist(
    [
      caldavPayload({
        CalDAVAccountDescription: 'Personal',
        CalDAVHostName: 'personal.example.test',
        CalDAVUsername: 'alice',
        CalDAVUseSSL: true,
      }),
      caldavPayload({
        CalDAVAccountDescription: 'Work',
        CalDAVHostName: 'work.example.test',
        CalDAVUsername: 'alice@example.test',
        CalDAVUseSSL: true,
      }),
    ].join('\n'),
  ),
} as const;

export const mobileConfigProfile = plist;
