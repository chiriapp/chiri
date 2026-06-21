import { describe, expect, it } from 'vitest';
import { mapDecodedMobileConfig } from '$lib/mobileconfig/import';
import type { DecodedMobileConfig, DecodedMobileConfigCalDAVPayload } from '$types/mobileconfig';

const decodedProfile = (
  ...caldavPayloads: DecodedMobileConfigCalDAVPayload[]
): DecodedMobileConfig => ({
  format: 'xml',
  signature: 'unsigned',
  caldavPayloads,
});

const mapPayload = (payload: DecodedMobileConfigCalDAVPayload) =>
  mapDecodedMobileConfig(decodedProfile(payload));

describe('mapDecodedMobileConfig', () => {
  it('maps a typical payload and defaults to HTTPS', () => {
    const result = mapPayload({
      accountDescription: 'Example Calendar',
      hostname: 'caldav.example.test',
      username: 'alice',
      password: 'app-password',
    });

    expect(result).toEqual({
      ok: true,
      format: 'xml',
      signature: 'unsigned',
      candidates: [
        {
          accountName: 'Example Calendar',
          serverUrl: 'https://caldav.example.test',
          username: 'alice',
          password: 'app-password',
          principalUrl: undefined,
          serverType: 'generic',
        },
      ],
    });
  });

  it('uses HTTP only when SSL is explicitly disabled', () => {
    const result = mapPayload({ hostname: 'localhost', port: 5232, useSSL: false });
    expect(result.ok && result.candidates[0]?.serverUrl).toBe('http://localhost:5232');
  });

  it('supports a port included in the hostname for legacy profiles', () => {
    const result = mapPayload({ hostname: 'localhost:5232', useSSL: false });
    expect(result.ok && result.candidates[0]?.serverUrl).toBe('http://localhost:5232');
  });

  it('rejects conflicting hostname and payload ports', () => {
    expect(mapPayload({ hostname: 'localhost:5232', port: 8443 })).toEqual({
      ok: false,
      reason: 'invalid-port',
    });
  });

  it('canonicalizes default ports and supports IPv6 hostnames', () => {
    const defaultPort = mapPayload({ hostname: 'example.test', port: 443 });
    const ipv6 = mapPayload({ hostname: '2001:db8::1', port: 8443 });

    expect(defaultPort.ok && defaultPort.candidates[0]?.serverUrl).toBe('https://example.test');
    expect(ipv6.ok && ipv6.candidates[0]?.serverUrl).toBe('https://[2001:db8::1]:8443');
  });

  it('preserves relative and absolute principal URLs', () => {
    const relative = mapPayload({ hostname: 'example.test', principalUrl: '/principals/alice/' });
    const absolute = mapPayload({
      hostname: 'example.test',
      principalUrl: 'https://principal.example.test/users/alice/',
    });

    expect(relative.ok && relative.candidates[0]?.principalUrl).toBe('/principals/alice/');
    expect(absolute.ok && absolute.candidates[0]?.principalUrl).toBe(
      'https://principal.example.test/users/alice/',
    );
    expect(absolute.ok && absolute.candidates[0]?.serverUrl).toBe('https://example.test');
  });

  it('does not infer provider types from hosts or principal paths', () => {
    const fastmail = mapPayload({ hostname: 'caldav.fastmail.com' });
    const rustical = mapPayload({
      hostname: 'calendar.example.test',
      principalUrl: '/caldav/principal/alice/',
    });

    expect(fastmail.ok && fastmail.candidates[0]?.serverType).toBe('generic');
    expect(rustical.ok && rustical.candidates[0]?.serverType).toBe('generic');
  });

  it('maps every CalDAV payload and preserves profile metadata', () => {
    const result = mapDecodedMobileConfig({
      format: 'signed-cms',
      signature: 'signed-unverified',
      caldavPayloads: [
        { hostname: 'personal.example.test', accountDescription: 'Personal' },
        { hostname: 'work.example.test', accountDescription: 'Work' },
      ],
    });

    expect(result.ok && result.format).toBe('signed-cms');
    expect(result.ok && result.signature).toBe('signed-unverified');
    expect(result.ok && result.candidates.map(({ accountName }) => accountName)).toEqual([
      'Personal',
      'Work',
    ]);
  });

  it('falls back to a trimmed username for the account name', () => {
    const result = mapPayload({ hostname: 'example.test', username: ' alice ' });
    expect(result.ok && result.candidates[0]?.accountName).toBe('alice');
    expect(result.ok && result.candidates[0]?.username).toBe('alice');
  });

  it.each([
    [{}, 'missing-hostname'],
    [{ hostname: 'https://example.test' }, 'invalid-hostname'],
    [{ hostname: 'user@example.test' }, 'invalid-hostname'],
    [{ hostname: 'example.test/path' }, 'invalid-hostname'],
    [{ hostname: 'example.test', port: 0 }, 'invalid-port'],
    [{ hostname: 'example.test', port: 65536 }, 'invalid-port'],
    [
      { hostname: 'example.test', principalUrl: 'ftp://example.test/alice' },
      'invalid-principal-url',
    ],
    [
      { hostname: 'example.test', principalUrl: '//other.example.test/alice' },
      'invalid-principal-url',
    ],
    [
      { hostname: 'example.test', principalUrl: 'https://user:secret@example.test/alice' },
      'invalid-principal-url',
    ],
  ] as const)('rejects invalid payload %# with %s', (payload, reason) => {
    expect(mapPayload(payload)).toEqual({ ok: false, reason });
  });

  it('rejects a decoded profile with no CalDAV payloads', () => {
    expect(mapDecodedMobileConfig(decodedProfile())).toEqual({
      ok: false,
      reason: 'missing-caldav-payload',
    });
  });
});
