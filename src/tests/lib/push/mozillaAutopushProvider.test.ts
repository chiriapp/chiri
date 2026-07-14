import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMozillaAutopushProviderConfig,
  createMozillaAutopushProviderSubscription,
  DEFAULT_MOZILLA_AUTOPUSH_ENDPOINT_URL,
  DEFAULT_MOZILLA_AUTOPUSH_WEBSOCKET_URL,
  removeMozillaAutopushProviderSubscription,
  restoreMozillaAutopushProviderSubscription,
  startMozillaAutopushProviderListening,
} from '$lib/push/providers/mozillaAutopush';
import type { Calendar } from '$types';
import { MOZILLA_AUTOPUSH_PROVIDER_ID, type PushSubscription } from '$types/push';

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

vi.mock('$lib/caldav/utils', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('$lib/push/webPushKeys', () => ({
  generateWebPushKeyPair: vi.fn(() =>
    Promise.resolve({
      publicKey: 'public-key',
      privateKey: 'private-key',
      authSecret: 'auth-secret',
    }),
  ),
}));

vi.mock('$utils/misc', () => ({ generateUUID: () => '123e4567-e89b-12d3-a456-426614174000' }));

const calendar = {
  id: 'calendar-1',
  displayName: 'Work',
  pushVapidKey: 'vapid-key',
} as Calendar;

const config = createMozillaAutopushProviderConfig(
  'wss://push.example.test/',
  'https://updates.example.test',
);

const registration = {
  uaid: 'uaid-1',
  channelId: '123e4567-e89b-12d3-a456-426614174000',
  endpoint: 'https://updates.example.test/wpush/abc',
};

const createStoredSubscription = (): PushSubscription => ({
  id: 'push-1',
  calendarId: calendar.id,
  accountId: 'account-1',
  registrationUrl: 'https://dav.example.test/push/1',
  pushResource: registration.endpoint,
  providerId: MOZILLA_AUTOPUSH_PROVIDER_ID,
  providerToken: registration.channelId,
  providerMetadata: JSON.stringify({
    version: 1,
    uaid: registration.uaid,
    channelId: registration.channelId,
    websocketUrl: config.websocketUrl,
    endpointUrl: config.endpointUrl,
  }),
  expiresAt: new Date('2030-01-01T00:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
});

const flushNativeListenerSetup = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('Mozilla Autopush provider config', () => {
  it('uses Mozilla production URLs by default', () => {
    expect(createMozillaAutopushProviderConfig('', '')).toEqual({
      websocketUrl: DEFAULT_MOZILLA_AUTOPUSH_WEBSOCKET_URL,
      endpointUrl: DEFAULT_MOZILLA_AUTOPUSH_ENDPOINT_URL,
    });
  });
});

describe('Mozilla Autopush provider', () => {
  beforeEach(() => {
    tauriMocks.invoke.mockReset();
    tauriMocks.invoke.mockResolvedValue(undefined);
    tauriMocks.listen.mockClear();
    tauriMocks.handlers.clear();
  });

  it('creates subscriptions through native Autopush registration', async () => {
    tauriMocks.invoke.mockResolvedValueOnce(registration as never);

    const endpoint = await createMozillaAutopushProviderSubscription(calendar, config);

    expect(tauriMocks.invoke).toHaveBeenCalledWith('mozilla_autopush_register', {
      websocketUrl: 'wss://push.example.test/',
      uaid: null,
      channelId: registration.channelId,
      vapidPublicKey: 'vapid-key',
    });
    expect(endpoint).toMatchObject({
      providerId: MOZILLA_AUTOPUSH_PROVIDER_ID,
      providerToken: registration.channelId,
      pushResource: registration.endpoint,
      subscriptionPublicKey: 'public-key',
      authSecret: 'auth-secret',
    });
    expect(JSON.parse(endpoint?.providerMetadata ?? '{}')).toMatchObject({
      uaid: registration.uaid,
      channelId: registration.channelId,
      websocketUrl: config.websocketUrl,
      endpointUrl: config.endpointUrl,
    });
  });

  it('restores and removes subscriptions with stored metadata', async () => {
    const subscription = createStoredSubscription();
    tauriMocks.invoke
      .mockResolvedValueOnce(registration.uaid as never)
      .mockResolvedValueOnce(undefined);

    await expect(
      restoreMozillaAutopushProviderSubscription(subscription, calendar, config),
    ).resolves.toBe(true);
    await removeMozillaAutopushProviderSubscription(subscription, config);

    expect(tauriMocks.invoke).toHaveBeenNthCalledWith(1, 'mozilla_autopush_restore', {
      websocketUrl: 'wss://push.example.test/',
      uaid: registration.uaid,
      channelId: registration.channelId,
    });
    expect(tauriMocks.invoke).toHaveBeenNthCalledWith(2, 'stop_mozilla_autopush_listener', {
      calendarId: calendar.id,
    });
    expect(tauriMocks.invoke).toHaveBeenNthCalledWith(3, 'mozilla_autopush_unregister', {
      websocketUrl: 'wss://push.example.test/',
      uaid: registration.uaid,
      channelId: registration.channelId,
    });
  });

  it('starts native listening and routes notifications', async () => {
    const subscription = createStoredSubscription();
    const onMessage = vi.fn();

    expect(startMozillaAutopushProviderListening(subscription, onMessage, config)).toBe(true);
    await flushNativeListenerSetup();

    expect(tauriMocks.invoke).toHaveBeenCalledWith('start_mozilla_autopush_listener', {
      calendarId: calendar.id,
      websocketUrl: 'wss://push.example.test/',
      uaid: registration.uaid,
      channelId: registration.channelId,
    });

    tauriMocks.handlers.get('mozilla-autopush://notification')?.({
      payload: {
        calendarId: calendar.id,
        channelId: registration.channelId,
        version: '42',
        data: 'sync please',
      },
    });

    expect(onMessage).toHaveBeenCalledWith(calendar.id, 'sync please');
  });
});
