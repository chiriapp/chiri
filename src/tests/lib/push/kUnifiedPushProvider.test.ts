import { invoke } from '@tauri-apps/api/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createKUnifiedPushProviderSubscription,
  removeKUnifiedPushProviderSubscription,
  restoreKUnifiedPushProviderSubscription,
} from '$lib/push/kUnifiedPushProvider';
import type { Calendar } from '$types';
import { KUNIFIED_PUSH_PROVIDER_ID, type PushSubscription } from '$types/push';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }));
vi.mock('$lib/caldav/utils', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('$lib/push/webPushKeys', () => ({
  generateWebPushKeyPair: vi.fn(async () => ({
    publicKey: 'public-key',
    privateKey: 'private-key',
    authSecret: 'auth-secret',
  })),
}));
vi.mock('$utils/misc', () => ({ generateUUID: () => 'provider-token' }));

const calendar = {
  id: 'calendar-id',
  displayName: 'Calendar',
  pushVapidKey: 'vapid-key',
} as Calendar;

const subscription = {
  id: 'subscription-id',
  calendarId: 'calendar-id',
  accountId: 'account-id',
  registrationUrl: 'https://caldav.example.test/push/subscription',
  pushResource: 'https://push.example.test/endpoint',
  providerId: KUNIFIED_PUSH_PROVIDER_ID,
  providerToken: 'provider-token',
  providerDistributor: 'org.unifiedpush.Distributor.saved',
  expiresAt: new Date('2030-01-01T00:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
} satisfies PushSubscription;

describe('KUnifiedPush provider', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it('persists the distributor returned by registration', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      endpoint: 'https://push.example.test/endpoint',
      token: 'provider-token',
      distributor: 'org.unifiedpush.Distributor.saved',
    });

    const endpoint = await createKUnifiedPushProviderSubscription(calendar);

    expect(invoke).toHaveBeenCalledWith('kunifiedpush_register', {
      token: 'provider-token',
      distributor: null,
      vapidPublicKey: 'vapid-key',
      description: 'Chiri: Calendar',
    });
    expect(endpoint).toMatchObject({
      providerId: KUNIFIED_PUSH_PROVIDER_ID,
      providerToken: 'provider-token',
      providerDistributor: 'org.unifiedpush.Distributor.saved',
      pushResource: 'https://push.example.test/endpoint',
    });
  });

  it('restores an existing token through its saved distributor', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      endpoint: 'https://push.example.test/endpoint',
      token: 'provider-token',
      distributor: 'org.unifiedpush.Distributor.saved',
    });

    await expect(restoreKUnifiedPushProviderSubscription(subscription, calendar)).resolves.toBe(
      true,
    );
    expect(invoke).toHaveBeenCalledWith('kunifiedpush_register', {
      token: 'provider-token',
      distributor: 'org.unifiedpush.Distributor.saved',
      vapidPublicKey: 'vapid-key',
      description: 'Chiri: Calendar',
    });
  });

  it('unregisters through the saved distributor', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined);

    await removeKUnifiedPushProviderSubscription(subscription);

    expect(invoke).toHaveBeenCalledWith('kunifiedpush_unregister', {
      token: 'provider-token',
      distributor: 'org.unifiedpush.Distributor.saved',
    });
  });
});
