import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Calendar } from '$types';
import {
  NTFY_DIRECT_PROVIDER_ID,
  type PushEndpointSubscription,
  type PushSubscription,
} from '$types/push';

const mocks = vi.hoisted(() => {
  let subscriptions: PushSubscription[] = [];
  let uuidCounter = 0;

  const db = {
    getPushSubscriptionsByCalendar: vi.fn(async () => subscriptions),
    getAllPushSubscriptions: vi.fn(async () => subscriptions),
    getExpiringSubscriptions: vi.fn(async () => []),
    upsertPushSubscription: vi.fn(async (subscription: PushSubscription) => {
      subscriptions = subscriptions.filter((item) => item.id !== subscription.id);
      subscriptions.push(subscription);
    }),
    deletePushSubscription: vi.fn(async (subscriptionId: string) => {
      subscriptions = subscriptions.filter((item) => item.id !== subscriptionId);
    }),
    deleteExpiredSubscriptions: vi.fn(async () => 0),
  };

  return {
    db,
    getSubscriptions: () => subscriptions,
    resetState: () => {
      subscriptions = [];
      uuidCounter = 0;
    },
    setSubscriptions: (nextSubscriptions: PushSubscription[]) => {
      subscriptions = nextSubscriptions;
    },
    nextUuid: () => {
      uuidCounter += 1;
      return `uuid-${uuidCounter}`;
    },
    getConnection: vi.fn(() => ({
      credentials: { username: 'unit-tests', password: 'unit-tests' },
    })),
    isConnected: vi.fn(() => true),
    registerPushSubscription: vi.fn(async () => ({
      registrationUrl: 'http://localhost:4000/push_subscription/new',
      expires: new Date(Date.now() + 72 * 60 * 60 * 1000),
    })),
    unregisterPushSubscription: vi.fn(async () => true),
    createNtfyProviderSubscription: vi.fn(
      async (): Promise<PushEndpointSubscription> => ({
        providerId: 'ntfy-direct',
        pushResource: 'https://ntfy.sh/up-test-topic',
        subscriptionPublicKey: 'public-key',
        authSecret: 'auth-secret',
        contentEncoding: 'aes128gcm',
      }),
    ),
    isNtfyProviderAvailable: vi.fn(async () => true),
    isNtfyProviderPushResource: vi.fn(() => true),
    removeNtfyProviderSubscription: vi.fn(),
    restoreNtfyProviderSubscription: vi.fn(async () => true),
    startNtfyProviderListening: vi.fn(() => true),
    stopAllNtfyProviderListeners: vi.fn(),
    stopNtfyProviderListening: vi.fn(),
    queryClient: {
      getQueryData: vi.fn(() => undefined),
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn(),
    },
  };
});

vi.mock('$lib/database', () => ({ db: mocks.db }));
vi.mock('$lib/caldav/connection', () => ({
  getConnection: mocks.getConnection,
  isConnected: mocks.isConnected,
}));
vi.mock('$lib/caldav/push', () => ({
  registerPushSubscription: mocks.registerPushSubscription,
  unregisterPushSubscription: mocks.unregisterPushSubscription,
}));
vi.mock('$lib/caldav/utils', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('$lib/push/linuxUnifiedPushProvider', () => ({
  createLinuxUnifiedPushProviderSubscription: vi.fn(),
  isLinuxUnifiedPushProviderAvailable: vi.fn(async () => false),
  removeLinuxUnifiedPushProviderSubscription: vi.fn(),
  restoreLinuxUnifiedPushProviderSubscription: vi.fn(async () => false),
  startLinuxUnifiedPushProviderListening: vi.fn(() => false),
  stopAllLinuxUnifiedPushProviderListeners: vi.fn(),
  stopLinuxUnifiedPushProviderListening: vi.fn(),
}));
vi.mock('$lib/push/ntfyProvider', () => ({
  createNtfyProviderSubscription: mocks.createNtfyProviderSubscription,
  isNtfyProviderAvailable: mocks.isNtfyProviderAvailable,
  isNtfyProviderPushResource: mocks.isNtfyProviderPushResource,
  removeNtfyProviderSubscription: mocks.removeNtfyProviderSubscription,
  restoreNtfyProviderSubscription: mocks.restoreNtfyProviderSubscription,
  startNtfyProviderListening: mocks.startNtfyProviderListening,
  stopAllNtfyProviderListeners: mocks.stopAllNtfyProviderListeners,
  stopNtfyProviderListening: mocks.stopNtfyProviderListening,
}));
vi.mock('$lib/queryClient', () => ({
  queryClient: mocks.queryClient,
  queryKeys: {
    pushSubscriptions: {
      all: ['push-subscriptions'],
      byCalendar: (calendarId: string) => ['push-subscriptions', calendarId],
    },
  },
}));
vi.mock('$utils/misc', () => ({ generateUUID: mocks.nextUuid }));

import { disablePushForCalendar, enablePushForCalendar, initializePushManager } from '$lib/push';

const calendar: Calendar = {
  id: 'calendar-1',
  accountId: 'account-1',
  displayName: 'Default',
  url: 'http://localhost:4000/caldav/principal/unit-tests/default/',
  sortOrder: 0,
  pushSupported: true,
  pushTopic: 'chiri-unit-tests-default',
};

const subscription = (id: string): PushSubscription => ({
  id,
  accountId: 'account-1',
  calendarId: calendar.id,
  registrationUrl: `http://localhost:4000/push_subscription/${id}`,
  pushResource: 'https://ntfy.sh/up-test-topic',
  providerId: NTFY_DIRECT_PROVIDER_ID,
  expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
  createdAt: new Date(),
});

describe('enablePushForCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resetState();
    initializePushManager(vi.fn());
  });

  it('coalesces concurrent setup for the same calendar and provider', async () => {
    const results = await Promise.all([
      enablePushForCalendar('account-1', calendar),
      enablePushForCalendar('account-1', calendar),
    ]);

    expect(results).toEqual([true, true]);
    expect(mocks.registerPushSubscription).toHaveBeenCalledTimes(1);
    expect(mocks.db.upsertPushSubscription).toHaveBeenCalledTimes(1);
    expect(mocks.startNtfyProviderListening).toHaveBeenCalledTimes(1);
    expect(mocks.getSubscriptions()).toHaveLength(1);
  });

  it('removes duplicate active subscriptions before restoring the kept one', async () => {
    const kept = subscription('kept');
    const duplicate = subscription('duplicate');
    mocks.setSubscriptions([kept, duplicate]);

    const result = await enablePushForCalendar('account-1', calendar);

    expect(result).toBe(true);
    expect(mocks.registerPushSubscription).not.toHaveBeenCalled();
    expect(mocks.unregisterPushSubscription).toHaveBeenCalledWith(duplicate.registrationUrl, {
      username: 'unit-tests',
      password: 'unit-tests',
    });
    expect(mocks.db.deletePushSubscription).toHaveBeenCalledWith(duplicate.id);
    expect(mocks.restoreNtfyProviderSubscription).toHaveBeenCalledWith(kept, calendar);
    expect(mocks.startNtfyProviderListening).toHaveBeenCalledTimes(1);
    expect(mocks.getSubscriptions()).toEqual([kept]);
  });

  it('recreates stored subscriptions from a previous app runtime before listening', async () => {
    const stale = {
      ...subscription('stale'),
      createdAt: new Date('2000-01-01T00:00:00.000Z'),
    };
    mocks.setSubscriptions([stale]);

    const result = await enablePushForCalendar('account-1', calendar);

    expect(result).toBe(true);
    expect(mocks.unregisterPushSubscription).toHaveBeenCalledWith(stale.registrationUrl, {
      username: 'unit-tests',
      password: 'unit-tests',
    });
    expect(mocks.db.deletePushSubscription).toHaveBeenCalledWith(stale.id);
    expect(mocks.restoreNtfyProviderSubscription).not.toHaveBeenCalled();
    expect(mocks.registerPushSubscription).toHaveBeenCalledTimes(1);
    expect(mocks.db.upsertPushSubscription).toHaveBeenCalledTimes(1);
    expect(mocks.startNtfyProviderListening).toHaveBeenCalledTimes(1);
    expect(mocks.getSubscriptions()).toHaveLength(1);
    expect(mocks.getSubscriptions()[0].id).toBe('uuid-1');
  });

  it('removes provider, server, and local registrations when disabling push', async () => {
    const stored = subscription('stored');
    mocks.setSubscriptions([stored]);

    await disablePushForCalendar('account-1', calendar.id);

    expect(mocks.stopNtfyProviderListening).toHaveBeenCalledWith(calendar.id);
    expect(mocks.removeNtfyProviderSubscription).toHaveBeenCalledWith(stored);
    expect(mocks.unregisterPushSubscription).toHaveBeenCalledWith(stored.registrationUrl, {
      username: 'unit-tests',
      password: 'unit-tests',
    });
    expect(mocks.db.deletePushSubscription).toHaveBeenCalledWith(stored.id);
    expect(mocks.getSubscriptions()).toEqual([]);
  });
});
