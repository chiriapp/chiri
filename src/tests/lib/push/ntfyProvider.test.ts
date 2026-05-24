import { describe, expect, it } from 'vitest';
import {
  createNtfyProviderConfig,
  DEFAULT_NTFY_SERVER_URL,
  getNtfyProviderSseUrl,
  isNtfyProviderPushResource,
  normalizeNtfyProviderServerUrl,
} from '$lib/push/ntfyProvider';

describe('normalizeNtfyProviderServerUrl', () => {
  it('uses ntfy.sh when the configured value is blank', () => {
    expect(normalizeNtfyProviderServerUrl('')).toBe(DEFAULT_NTFY_SERVER_URL);
    expect(normalizeNtfyProviderServerUrl('   ')).toBe(DEFAULT_NTFY_SERVER_URL);
  });

  it('adds https to bare hostnames', () => {
    expect(normalizeNtfyProviderServerUrl('ntfy.example.com')).toBe('https://ntfy.example.com');
  });

  it('strips trailing slashes, query strings, and hashes', () => {
    expect(normalizeNtfyProviderServerUrl('https://ntfy.example.com/custom/?foo=bar#section')).toBe(
      'https://ntfy.example.com/custom',
    );
  });
});

describe('getNtfyProviderSseUrl', () => {
  it('listens on the subscription endpoint that was registered with CalDAV', () => {
    expect(getNtfyProviderSseUrl('https://ntfy.example.com/upabc123')).toBe(
      'https://ntfy.example.com/upabc123/sse',
    );
  });
});

describe('isNtfyProviderPushResource', () => {
  it('matches push resources created for the configured server', () => {
    const config = createNtfyProviderConfig('https://ntfy.example.com');

    expect(isNtfyProviderPushResource('https://ntfy.example.com/upabc123', config)).toBe(true);
  });

  it('rejects push resources from a previous server', () => {
    const config = createNtfyProviderConfig('https://ntfy.example.com');

    expect(isNtfyProviderPushResource('https://ntfy.sh/upabc123', config)).toBe(false);
  });

  it('supports ntfy servers hosted under a path', () => {
    const config = createNtfyProviderConfig('https://example.com/ntfy');

    expect(isNtfyProviderPushResource('https://example.com/ntfy/upabc123', config)).toBe(true);
    expect(isNtfyProviderPushResource('https://example.com/other/upabc123', config)).toBe(false);
  });
});
