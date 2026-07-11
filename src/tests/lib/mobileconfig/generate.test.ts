import { describe, expect, it } from 'vitest';
import {
  generateMobileConfig,
  getMobileConfigCredentialWarnings,
  getMobileConfigExportEligibility,
} from '$lib/mobileconfig/generate';
import type { Account } from '$types';

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 'account-1',
  name: 'Work & Personal',
  icon: 'user',
  emoji: '',
  calendars: [],
  isActive: true,
  sortOrder: 0,
  caldav: {
    serverUrl: 'https://caldav.example.test:8443',
    username: 'alice@example.test',
    password: 'app-password',
    serverType: 'generic',
    principalUrl: '/principals/alice/',
    authType: 'basic',
  },
  ...overrides,
});

describe('generateMobileConfig', () => {
  it('generates a deterministic CalDAV configuration profile without credentials by default', () => {
    const xml = generateMobileConfig(account(), {
      profileUuid: 'profile-id',
      payloadUuid: 'payload-id',
    });

    expect(xml).toContain('<key>CalDAVAccountDescription</key>');
    expect(xml).toContain('<string>Work &amp; Personal</string>');
    expect(xml).toContain('<key>CalDAVHostName</key>\n\t\t\t<string>caldav.example.test</string>');
    expect(xml).toContain('<key>CalDAVPort</key>\n\t\t\t<integer>8443</integer>');
    expect(xml).toContain('<key>CalDAVUseSSL</key>\n\t\t\t<true/>');
    expect(xml).toContain('<key>CalDAVUsername</key>\n\t\t\t<string>alice@example.test</string>');
    expect(xml).toContain(
      '<key>CalDAVPrincipalURL</key>\n\t\t\t<string>/principals/alice/</string>',
    );
    expect(xml).toContain('<string>PROFILE-ID</string>');
    expect(xml).toContain('<string>PAYLOAD-ID</string>');
    expect(xml).not.toContain('CalDAVPassword');
    expect(xml).not.toContain('app-password');
  });

  it('embeds the credential only when explicitly requested', () => {
    const xml = generateMobileConfig(account(), {
      includePassword: true,
      profileUuid: 'profile-id',
      payloadUuid: 'payload-id',
    });

    expect(xml).toContain('<key>CalDAVPassword</key>');
    expect(xml).toContain('<string>app-password</string>');
  });

  it('uses HTTP only when the account URL uses HTTP', () => {
    const xml = generateMobileConfig(
      account({
        caldav: {
          serverUrl: 'http://localhost:5232',
          username: 'alice',
          password: 'secret',
          serverType: 'generic',
          authType: 'basic',
        },
      }),
      { profileUuid: 'profile-id', payloadUuid: 'payload-id' },
    );

    expect(xml).toContain('<key>CalDAVHostName</key>\n\t\t\t<string>localhost</string>');
    expect(xml).toContain('<key>CalDAVPort</key>\n\t\t\t<integer>5232</integer>');
    expect(xml).toContain('<key>CalDAVUseSSL</key>\n\t\t\t<false/>');
  });

  it('rejects accounts that cannot be exported safely', () => {
    expect(getMobileConfigExportEligibility(account({ caldav: null }))).toEqual({
      eligible: false,
      reason: 'local-account',
    });
    expect(
      getMobileConfigExportEligibility(
        account({
          caldav: {
            serverUrl: 'ftp://example.test',
            username: 'alice',
            password: 'secret',
            serverType: 'generic',
            authType: 'basic',
          },
        }),
      ),
    ).toEqual({ eligible: false, reason: 'invalid-server-url' });
    expect(getMobileConfigExportEligibility(account())).toEqual({ eligible: true });
  });

  it('warns only when exporting an OAuth account credential', () => {
    const oauthAccount = account({
      caldav: {
        serverUrl: 'https://caldav.fastmail.com',
        username: 'alice@example.test',
        password: 'access-token',
        serverType: 'fastmail',
        authType: 'oauth',
        refreshToken: 'refresh-token',
        tokenExpiry: '2030-01-01T00:00:00.000Z',
      },
    });

    expect(getMobileConfigCredentialWarnings(oauthAccount, false)).toEqual([]);
    expect(getMobileConfigCredentialWarnings(oauthAccount, true)).toEqual([
      'oauth-token-may-expire',
    ]);
    expect(getMobileConfigCredentialWarnings(account(), true)).toEqual([]);
  });
});
