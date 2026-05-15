import { describe, expect, it } from 'vitest';
import { buildDigestAuth, parseDigestChallenge } from '$lib/digest-auth';

describe('parseDigestChallenge', () => {
  it('parses a minimal Digest challenge', () => {
    const result = parseDigestChallenge('Digest realm="example", nonce="abc123"');
    expect(result).toEqual({
      realm: 'example',
      nonce: 'abc123',
      opaque: undefined,
      qop: undefined,
      algorithm: undefined,
    });
  });

  it('parses a full challenge with all parameters', () => {
    const header =
      'Digest realm="testrealm@host.com", qop="auth,auth-int", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", opaque="5ccc069c403ebaf9f0171e9517f40e41", algorithm=MD5';
    const result = parseDigestChallenge(header);
    expect(result?.realm).toBe('testrealm@host.com');
    expect(result?.nonce).toBe('dcd98b7102dd2f0e8b11d0f600bfb0c093');
    expect(result?.opaque).toBe('5ccc069c403ebaf9f0171e9517f40e41');
    expect(result?.qop).toBe('auth,auth-int');
    expect(result?.algorithm).toBe('MD5');
  });

  it('accepts unquoted parameter values', () => {
    const result = parseDigestChallenge('Digest realm=foo, nonce=bar, algorithm=MD5');
    expect(result?.realm).toBe('foo');
    expect(result?.nonce).toBe('bar');
    expect(result?.algorithm).toBe('MD5');
  });

  it('is case-insensitive on the "Digest" scheme', () => {
    expect(parseDigestChallenge('digest realm="r", nonce="n"')?.realm).toBe('r');
    expect(parseDigestChallenge('DIGEST realm="r", nonce="n"')?.realm).toBe('r');
  });

  it('returns null if not a Digest header', () => {
    expect(parseDigestChallenge('Basic realm="x"')).toBeNull();
    expect(parseDigestChallenge('Bearer token')).toBeNull();
    expect(parseDigestChallenge('')).toBeNull();
  });

  it('returns null if realm is missing', () => {
    expect(parseDigestChallenge('Digest nonce="n"')).toBeNull();
  });

  it('returns null if nonce is missing', () => {
    expect(parseDigestChallenge('Digest realm="r"')).toBeNull();
  });

  it('handles realms containing special characters inside quotes', () => {
    const result = parseDigestChallenge('Digest realm="user@host:port", nonce="n"');
    expect(result?.realm).toBe('user@host:port');
  });
});

describe('buildDigestAuth', () => {
  // RFC 2617 §3.5 worked example. Note: cnonce/nc are deterministic here only
  // when qop is absent — we test the qop path separately for shape.
  it('produces correct response for legacy (no-qop) digest', () => {
    const challenge = {
      realm: 'testrealm@host.com',
      nonce: 'dcd98b7102dd2f0e8b11d0f600bfb0c093',
    };
    const result = buildDigestAuth('GET', '/dir/index.html', 'Mufasa', 'Circle Of Life', challenge);
    // MD5("Mufasa:testrealm@host.com:Circle Of Life") = 939e7578ed9e3c518a452acee763bce9
    // MD5("GET:/dir/index.html") = 39aff3a2bab6126f332b942af96d3366
    // MD5(ha1:nonce:ha2) = 670fd8c2df070c60b045671b8b24ff02
    expect(result).toContain('response="670fd8c2df070c60b045671b8b24ff02"');
    expect(result).toContain('username="Mufasa"');
    expect(result).toContain('realm="testrealm@host.com"');
    expect(result).toContain('nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093"');
    expect(result).toContain('uri="/dir/index.html"');
    expect(result).not.toContain('qop=');
    expect(result).not.toContain('cnonce=');
  });

  it('includes qop, nc, and cnonce when challenge advertises auth qop', () => {
    const result = buildDigestAuth('GET', '/path', 'user', 'pass', {
      realm: 'r',
      nonce: 'n',
      qop: 'auth',
    });
    expect(result).toContain('qop=auth');
    expect(result).toContain('nc=00000001');
    expect(result).toMatch(/cnonce="[0-9a-f]{1,8}"/);
  });

  it('uses qop=auth when challenge lists "auth,auth-int"', () => {
    const result = buildDigestAuth('GET', '/p', 'u', 'p', {
      realm: 'r',
      nonce: 'n',
      qop: 'auth,auth-int',
    });
    expect(result).toContain('qop=auth');
  });

  it('falls back to legacy (no qop) when challenge specifies only auth-int', () => {
    const result = buildDigestAuth('GET', '/p', 'u', 'p', {
      realm: 'r',
      nonce: 'n',
      qop: 'auth-int',
    });
    expect(result).not.toContain('qop=');
  });

  it('extracts pathname + search from a full URL', () => {
    const result = buildDigestAuth('GET', 'https://example.com/dav/cal?foo=bar', 'u', 'p', {
      realm: 'r',
      nonce: 'n',
    });
    expect(result).toContain('uri="/dav/cal?foo=bar"');
  });

  it('uses url as-is when URL parsing fails (relative path)', () => {
    const result = buildDigestAuth('PROPFIND', '/dav/cal/', 'u', 'p', {
      realm: 'r',
      nonce: 'n',
    });
    expect(result).toContain('uri="/dav/cal/"');
  });

  it('includes opaque when present in challenge', () => {
    const result = buildDigestAuth('GET', '/p', 'u', 'p', {
      realm: 'r',
      nonce: 'n',
      opaque: 'op123',
    });
    expect(result).toContain('opaque="op123"');
  });

  it('includes algorithm when present in challenge', () => {
    const result = buildDigestAuth('GET', '/p', 'u', 'p', {
      realm: 'r',
      nonce: 'n',
      algorithm: 'MD5',
    });
    expect(result).toContain('algorithm=MD5');
  });

  it('handles empty username and password without crashing', () => {
    const result = buildDigestAuth('GET', '/p', '', '', { realm: 'r', nonce: 'n' });
    expect(result).toContain('username=""');
    expect(result).toMatch(/response="[a-f0-9]{32}"/);
  });

  it('returns a string starting with "Digest "', () => {
    const result = buildDigestAuth('GET', '/p', 'u', 'p', { realm: 'r', nonce: 'n' });
    expect(result.startsWith('Digest ')).toBe(true);
  });

  it('different methods produce different responses (same other params)', () => {
    const challenge = { realm: 'r', nonce: 'n' };
    const get = buildDigestAuth('GET', '/p', 'u', 'p', challenge);
    const post = buildDigestAuth('POST', '/p', 'u', 'p', challenge);
    expect(get).not.toBe(post);
  });

  it('different passwords produce different responses', () => {
    const challenge = { realm: 'r', nonce: 'n' };
    const a = buildDigestAuth('GET', '/p', 'u', 'pass1', challenge);
    const b = buildDigestAuth('GET', '/p', 'u', 'pass2', challenge);
    expect(a).not.toBe(b);
  });
});
