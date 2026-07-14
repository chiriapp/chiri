import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createNtfyProviderConfig,
  DEFAULT_NTFY_SERVER_URL,
  getNtfyProviderSseUrl,
  getNtfyProviderSubscriptionDiagnostics,
  isNtfyProviderPushResource,
  normalizeNtfyProviderServerUrl,
  removeNtfyProviderSubscription,
  restoreNtfyProviderSubscription,
  startNtfyProviderListening,
} from '$lib/push/providers/ntfy';
import type { Calendar } from '$types';
import { NTFY_DIRECT_PROVIDER_ID, type PushSubscription } from '$types/push';

const tauriMocks = vi.hoisted(() => {
  const handlers = new Map<string, (event: { payload: unknown }) => void>();
  return {
    handlers,
    invoke: vi.fn(() => Promise.resolve()),
    listen: vi.fn((eventName: string, handler: (event: { payload: unknown }) => void) => {
      handlers.set(eventName, handler);
      return Promise.resolve(() => handlers.delete(eventName));
    }),
  };
});

vi.mock('@tauri-apps/api/core', () => ({
  invoke: tauriMocks.invoke,
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: tauriMocks.listen,
}));

vi.mock('$lib/push/keys', () => ({
  base64UrlEncode: () => 'abc123abc123',
  generateWebPushKeyPair: vi.fn(() =>
    Promise.resolve({
      publicKey: 'public-key',
      privateKey: 'private-key',
      authSecret: 'auth-secret',
    }),
  ),
}));

beforeEach(() => {
  tauriMocks.invoke.mockClear();
  tauriMocks.listen.mockClear();
});

const flushNativeListenerSetup = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

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

describe('startNtfyProviderListening', () => {
  it('starts the native SSE listener and dispatches native ntfy messages', async () => {
    const calendar = {
      id: 'calendar-1',
      displayName: 'Work',
    } as Calendar;
    const subscription = {
      id: 'push-1',
      calendarId: calendar.id,
      accountId: 'account-1',
      registrationUrl: 'https://dav.example.com/push/1',
      pushResource: 'https://ntfy.example.com/upabc123',
      providerId: NTFY_DIRECT_PROVIDER_ID,
      expiresAt: new Date('2026-06-06T00:00:00.000Z'),
      createdAt: new Date('2026-06-05T00:00:00.000Z'),
    } satisfies PushSubscription;
    const onMessage = vi.fn();

    await restoreNtfyProviderSubscription(subscription, calendar);

    expect(startNtfyProviderListening(subscription, onMessage)).toBe(true);
    expect(getNtfyProviderSubscriptionDiagnostics(calendar.id)?.listening).toBe(false);

    await flushNativeListenerSetup();

    expect(tauriMocks.listen).toHaveBeenCalledWith('ntfy://connected', expect.any(Function));
    expect(tauriMocks.listen).toHaveBeenCalledWith('ntfy://event', expect.any(Function));
    expect(tauriMocks.listen).toHaveBeenCalledWith('ntfy://error', expect.any(Function));
    expect(tauriMocks.invoke).toHaveBeenCalledWith('start_ntfy_sse_listener', {
      calendarId: calendar.id,
      topic: 'upabc123',
      sseUrl: 'https://ntfy.example.com/upabc123/sse',
    });

    tauriMocks.handlers.get('ntfy://connected')?.({
      payload: { calendarId: calendar.id, topic: 'upabc123' },
    });

    expect(getNtfyProviderSubscriptionDiagnostics(calendar.id)?.listening).toBe(true);

    tauriMocks.handlers.get('ntfy://event')?.({
      payload: {
        calendarId: calendar.id,
        topic: 'upabc123',
        data: JSON.stringify({ event: 'message', message: 'WebDAV Push message received' }),
      },
    });

    expect(onMessage).toHaveBeenCalledWith(calendar.id, 'WebDAV Push message received');

    removeNtfyProviderSubscription(subscription);
  });
});
