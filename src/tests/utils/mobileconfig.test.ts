import { describe, expect, it } from 'vitest';
import { parseAppleConfigProfile } from '$utils/mobileconfig';

const profile = (caldavPayload: string) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    ${caldavPayload}
  </array>
</dict>
</plist>`;

const caldavDict = (fields: Record<string, string | boolean>) => {
  const entries = Object.entries(fields)
    .map(([k, v]) => {
      if (typeof v === 'boolean') return `<key>${k}</key><${v ? 'true' : 'false'}/>`;
      return `<key>${k}</key><string>${v}</string>`;
    })
    .join('\n');
  return `<dict>
    <key>PayloadType</key>
    <string>com.apple.caldav.account</string>
    ${entries}
  </dict>`;
};

describe('parseAppleConfigProfile', () => {
  it('returns null for invalid XML', () => {
    expect(parseAppleConfigProfile('not xml at all')).toBeNull();
  });

  it('returns null when there is no PayloadContent array', () => {
    expect(parseAppleConfigProfile('<?xml version="1.0"?><plist><dict></dict></plist>')).toBeNull();
  });

  it('returns null when no caldav payload is present', () => {
    const xml = profile(
      `<dict>
        <key>PayloadType</key>
        <string>com.apple.mail.managed</string>
      </dict>`,
    );
    expect(parseAppleConfigProfile(xml)).toBeNull();
  });

  it('extracts CalDAV fields from a typical profile', () => {
    const xml = profile(
      caldavDict({
        CalDAVHostName: 'caldav.example.com',
        CalDAVUsername: 'alice',
        CalDAVPassword: 's3cret',
        CalDAVUseSSL: true,
        CalDAVAccountDescription: 'My Calendar',
      }),
    );
    const result = parseAppleConfigProfile(xml);
    expect(result?.username).toBe('alice');
    expect(result?.password).toBe('s3cret');
    expect(result?.serverUrl).toBe('https://caldav.example.com');
    expect(result?.accountName).toBe('My Calendar');
  });

  it('uses http when CalDAVUseSSL is false', () => {
    const xml = profile(caldavDict({ CalDAVHostName: 'localhost:5232', CalDAVUseSSL: false }));
    expect(parseAppleConfigProfile(xml)?.serverUrl).toBe('http://localhost:5232');
  });

  it('prefers principal URL host when available', () => {
    const xml = profile(
      caldavDict({
        CalDAVHostName: 'caldav.example.com',
        CalDAVPrincipalURL: 'https://other.example.com/dav.php/principals/alice/',
        CalDAVUseSSL: true,
      }),
    );
    const result = parseAppleConfigProfile(xml);
    expect(result?.serverUrl).toBe('https://other.example.com');
    expect(result?.principalUrl).toBe('https://other.example.com/dav.php/principals/alice/');
  });

  it('falls back to username when no account description', () => {
    const xml = profile(caldavDict({ CalDAVHostName: 'x.com', CalDAVUsername: 'bob' }));
    expect(parseAppleConfigProfile(xml)?.accountName).toBe('bob');
  });

  it('detects Baikal from principal URL', () => {
    const xml = profile(
      caldavDict({
        CalDAVHostName: 'x.com',
        CalDAVPrincipalURL: 'https://x.com/dav.php/principals/alice/',
      }),
    );
    expect(parseAppleConfigProfile(xml)?.serverType).toBe('baikal');
  });

  it('detects Nextcloud from principal URL', () => {
    const xml = profile(
      caldavDict({
        CalDAVHostName: 'cloud.x.com',
        CalDAVPrincipalURL: 'https://cloud.x.com/remote.php/dav/principals/users/alice/',
      }),
    );
    expect(parseAppleConfigProfile(xml)?.serverType).toBe('nextcloud');
  });

  it('detects Rustical from principal URL', () => {
    const xml = profile(
      caldavDict({
        CalDAVHostName: 'x.com',
        CalDAVPrincipalURL: 'https://x.com/caldav/principal/alice/',
      }),
    );
    expect(parseAppleConfigProfile(xml)?.serverType).toBe('rustical');
  });

  it('detects Radicale from flat principal URL (relative and absolute)', () => {
    const relative = profile(
      caldavDict({ CalDAVHostName: 'x.com', CalDAVPrincipalURL: '/alice/' }),
    );
    expect(parseAppleConfigProfile(relative)?.serverType).toBe('radicale');

    const absolute = profile(
      caldavDict({ CalDAVHostName: 'x.com', CalDAVPrincipalURL: 'https://x.com/alice/' }),
    );
    expect(parseAppleConfigProfile(absolute)?.serverType).toBe('radicale');
  });

  it('classifies absolute Radicale principal URL as radicale, not generic (regression)', () => {
    const xml = profile(
      caldavDict({
        CalDAVHostName: 'radicale.example.com',
        CalDAVPrincipalURL: 'https://radicale.example.com/alice/',
      }),
    );
    expect(parseAppleConfigProfile(xml)?.serverType).toBe('radicale');
  });

  it('detects fastmail by hostname', () => {
    const xml = profile(caldavDict({ CalDAVHostName: 'caldav.fastmail.com' }));
    expect(parseAppleConfigProfile(xml)?.serverType).toBe('fastmail');
  });

  it('detects mailbox.org by hostname', () => {
    const xml = profile(caldavDict({ CalDAVHostName: 'dav.mailbox.org' }));
    expect(parseAppleConfigProfile(xml)?.serverType).toBe('mailbox');
  });

  it('defaults to generic when no patterns match', () => {
    const xml = profile(
      caldavDict({
        CalDAVHostName: 'unknown.example.com',
        CalDAVPrincipalURL: 'https://unknown.example.com/some/weird/path/structure/',
      }),
    );
    expect(parseAppleConfigProfile(xml)?.serverType).toBe('generic');
  });
});
