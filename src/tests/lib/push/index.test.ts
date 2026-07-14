import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account, Calendar } from '$types';
import {
  NTFY_DIRECT_PROVIDER_ID,
  type PushEndpointSubscription,
  type PushProviderSubscriptionDiagnostics,
  type PushSubscription,
} from '$types/push';

const mocks = vi.hoisted(() => {
  let subscriptions: PushSubscription[] = [];
  let uuidCounter = 0;

  const db = {
    getPushSubscriptionsByCalendar: vi.fn(async () => subscriptions),
    getAllPushSubscriptions: vi.fn(async () => subscriptions),
    upsertPushSubscription: vi.fn(async (subscription: PushSubscription) => {
      subscriptions = subscriptions.filter((item) => item.id !== subscription.id);
      subscriptions.push(subscription);
    }),
    deletePushSubscription: vi.fn(async (subscriptionId: string) => {
      subscriptions = subscriptions.filter((item) => item.id !== subscriptionId);
    }),
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
    getNtfyProviderSubscriptionDiagnostics: vi.fn(
      (): PushProviderSubscriptionDiagnostics | null => null,
    ),
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
vi.mock('$lib/push/providers/kUnifiedPush', () => ({
  createKUnifiedPushProviderSubscription: vi.fn(),
  getKUnifiedPushProviderSubscriptionDiagnostics: vi.fn(() => null),
  isKUnifiedPushProviderAvailable: vi.fn(async () => false),
  removeKUnifiedPushProviderSubscription: vi.fn(),
  restoreKUnifiedPushProviderSubscription: vi.fn(async () => false),
  startKUnifiedPushProviderListening: vi.fn(() => false),
  stopAllKUnifiedPushProviderListeners: vi.fn(),
  stopKUnifiedPushProviderListening: vi.fn(),
}));
vi.mock('$lib/push/providers/ntfy', () => ({
  createNtfyProviderSubscription: mocks.createNtfyProviderSubscription,
  isNtfyProviderAvailable: mocks.isNtfyProviderAvailable,
  isNtfyProviderPushResource: mocks.isNtfyProviderPushResource,
  removeNtfyProviderSubscription: mocks.removeNtfyProviderSubscription,
  restoreNtfyProviderSubscription: mocks.restoreNtfyProviderSubscription,
  startNtfyProviderListening: mocks.startNtfyProviderListening,
  getNtfyProviderSubscriptionDiagnostics: mocks.getNtfyProviderSubscriptionDiagnostics,
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
    pushDiagnostics: {
      all: ['push-diagnostics'],
      byAccount: (accountId: string) => ['push-diagnostics', accountId],
    },
  },
}));
vi.mock('$utils/misc', () => ({ generateUUID: mocks.nextUuid }));

import {
  disableAllPushSubscriptions,
  disablePushForCalendar,
  enablePushForCalendar,
  getWebDAVPushAccountDiagnostics,
  initializePushManager,
  restorePushListeners,
} from '$lib/push';

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

const account: Account = {
  id: 'account-1',
  name: 'Unit tests',
  calendars: [calendar],
  isActive: true,
  sortOrder: 0,
  caldav: null,
};

describe('enablePushForCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resetState();
    mocks.isConnected.mockReturnValue(true);
    mocks.registerPushSubscription.mockResolvedValue({
      registrationUrl: 'http://localhost:4000/push_subscription/new',
      expires: new Date(Date.now() + 72 * 60 * 60 * 1000),
    });
    mocks.restoreNtfyProviderSubscription.mockResolvedValue(true);
    mocks.startNtfyProviderListening.mockReturnValue(true);
    mocks.isNtfyProviderPushResource.mockReturnValue(true);
    mocks.getNtfyProviderSubscriptionDiagnostics.mockReturnValue(null);
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

  it('reuses stored subscriptions from a previous app runtime before listening', async () => {
    const stored = {
      ...subscription('stored'),
      createdAt: new Date('2000-01-01T00:00:00.000Z'),
    };
    mocks.setSubscriptions([stored]);

    const result = await enablePushForCalendar('account-1', calendar);

    expect(result).toBe(true);
    expect(mocks.restoreNtfyProviderSubscription).toHaveBeenCalledWith(stored, calendar);
    expect(mocks.unregisterPushSubscription).not.toHaveBeenCalled();
    expect(mocks.db.deletePushSubscription).not.toHaveBeenCalled();
    expect(mocks.registerPushSubscription).not.toHaveBeenCalled();
    expect(mocks.db.upsertPushSubscription).not.toHaveBeenCalled();
    expect(mocks.startNtfyProviderListening).toHaveBeenCalledTimes(1);
    expect(mocks.getSubscriptions()).toEqual([stored]);
  });

  it('leaves valid subscriptions alone when the provider listener is already active', async () => {
    const stored = {
      ...subscription('stored'),
      createdAt: new Date('2000-01-01T00:00:00.000Z'),
    };
    mocks.setSubscriptions([stored]);
    mocks.getNtfyProviderSubscriptionDiagnostics.mockReturnValue({
      calendarId: calendar.id,
      providerId: NTFY_DIRECT_PROVIDER_ID,
      listening: true,
      listenerStartedAt: new Date('2026-06-01T11:00:00.000Z'),
      lastConnectedAt: new Date('2026-06-01T11:00:01.000Z'),
      lastMessageAt: null,
      receivedMessages: 0,
      lastError: null,
      lastErrorAt: null,
    });

    const result = await enablePushForCalendar('account-1', calendar);

    expect(result).toBe(true);
    expect(mocks.restoreNtfyProviderSubscription).not.toHaveBeenCalled();
    expect(mocks.startNtfyProviderListening).not.toHaveBeenCalled();
    expect(mocks.registerPushSubscription).not.toHaveBeenCalled();
    expect(mocks.unregisterPushSubscription).not.toHaveBeenCalled();
    expect(mocks.db.deletePushSubscription).not.toHaveBeenCalled();
    expect(mocks.getSubscriptions()).toEqual([stored]);
  });

  it('recreates stored subscriptions only after provider restore fails', async () => {
    const stale = {
      ...subscription('stale'),
      createdAt: new Date('2000-01-01T00:00:00.000Z'),
    };
    mocks.setSubscriptions([stale]);
    mocks.restoreNtfyProviderSubscription.mockResolvedValueOnce(false);

    const result = await enablePushForCalendar('account-1', calendar);

    expect(result).toBe(true);
    expect(mocks.removeNtfyProviderSubscription).toHaveBeenCalledWith(stale);
    expect(mocks.registerPushSubscription).toHaveBeenCalledTimes(1);
    expect(mocks.unregisterPushSubscription).toHaveBeenCalledWith(stale.registrationUrl, {
      username: 'unit-tests',
      password: 'unit-tests',
    });
    expect(mocks.db.deletePushSubscription).toHaveBeenCalledWith(stale.id);
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

  it('removes every stored registration when disabling WebDAV Push globally', async () => {
    const stored = subscription('stored');
    mocks.setSubscriptions([stored]);

    await disableAllPushSubscriptions();

    expect(mocks.removeNtfyProviderSubscription).toHaveBeenCalledWith(stored);
    expect(mocks.unregisterPushSubscription).toHaveBeenCalledWith(stored.registrationUrl, {
      username: 'unit-tests',
      password: 'unit-tests',
    });
    expect(mocks.db.deletePushSubscription).toHaveBeenCalledWith(stored.id);
    expect(mocks.stopAllNtfyProviderListeners).toHaveBeenCalledTimes(1);
    expect(mocks.getSubscriptions()).toEqual([]);
  });

  it('restores previous-runtime subscriptions on startup and reuses them later', async () => {
    const stored = {
      ...subscription('stored'),
      createdAt: new Date('2000-01-01T00:00:00.000Z'),
    };
    mocks.setSubscriptions([stored]);

    const restored = await restorePushListeners([calendar]);
    const enabled = await enablePushForCalendar('account-1', calendar);

    expect(restored).toBe(1);
    expect(enabled).toBe(true);
    expect(mocks.restoreNtfyProviderSubscription).toHaveBeenCalledWith(stored, calendar);
    expect(mocks.registerPushSubscription).not.toHaveBeenCalled();
    expect(mocks.unregisterPushSubscription).not.toHaveBeenCalled();
    expect(mocks.db.deletePushSubscription).not.toHaveBeenCalled();
    expect(mocks.getSubscriptions()).toEqual([stored]);
  });

  it('removes duplicate active subscriptions before restoring startup listeners', async () => {
    const older = {
      ...subscription('older'),
      expiresAt: new Date(Date.now() + 70 * 60 * 60 * 1000),
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
    };
    const newer = {
      ...subscription('newer'),
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      createdAt: new Date('2026-06-02T00:00:00.000Z'),
    };
    mocks.setSubscriptions([older, newer]);

    const restored = await restorePushListeners([calendar]);

    expect(restored).toBe(1);
    expect(mocks.restoreNtfyProviderSubscription).toHaveBeenCalledTimes(1);
    expect(mocks.restoreNtfyProviderSubscription).toHaveBeenCalledWith(newer, calendar);
    expect(mocks.startNtfyProviderListening).toHaveBeenCalledTimes(1);
    expect(mocks.startNtfyProviderListening).toHaveBeenCalledWith(newer, expect.any(Function));
    expect(mocks.unregisterPushSubscription).toHaveBeenCalledWith(older.registrationUrl, {
      username: 'unit-tests',
      password: 'unit-tests',
    });
    expect(mocks.db.deletePushSubscription).toHaveBeenCalledWith(older.id);
    expect(mocks.getSubscriptions()).toEqual([newer]);
  });

  it('recreates previous-runtime subscriptions when provider restore fails on startup', async () => {
    const stored = {
      ...subscription('stored'),
      createdAt: new Date('2000-01-01T00:00:00.000Z'),
    };
    mocks.setSubscriptions([stored]);
    mocks.restoreNtfyProviderSubscription.mockResolvedValueOnce(false);

    const restored = await restorePushListeners([calendar]);

    expect(restored).toBe(1);
    expect(mocks.unregisterPushSubscription).toHaveBeenCalledWith(stored.registrationUrl, {
      username: 'unit-tests',
      password: 'unit-tests',
    });
    expect(mocks.db.deletePushSubscription).toHaveBeenCalledWith(stored.id);
    expect(mocks.registerPushSubscription).toHaveBeenCalledTimes(1);
    expect(mocks.db.upsertPushSubscription).toHaveBeenCalledTimes(1);
    expect(mocks.startNtfyProviderListening).toHaveBeenCalledTimes(1);
    expect(mocks.getSubscriptions()).toHaveLength(1);
    expect(mocks.getSubscriptions()[0].id).toBe('uuid-1');
  });

  it('keeps stored subscriptions when startup recreation cannot connect to the account', async () => {
    const stale = {
      ...subscription('stale'),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date('2000-01-01T00:00:00.000Z'),
    };
    mocks.setSubscriptions([stale]);
    mocks.isConnected.mockReturnValue(false);

    const restored = await restorePushListeners([calendar]);

    expect(restored).toBe(0);
    expect(mocks.removeNtfyProviderSubscription).not.toHaveBeenCalled();
    expect(mocks.registerPushSubscription).not.toHaveBeenCalled();
    expect(mocks.unregisterPushSubscription).not.toHaveBeenCalled();
    expect(mocks.db.deletePushSubscription).not.toHaveBeenCalled();
    expect(mocks.getSubscriptions()).toEqual([stale]);
  });

  it('cleans up a newly-created provider endpoint when server registration fails', async () => {
    mocks.registerPushSubscription.mockResolvedValueOnce(null as never);

    const result = await enablePushForCalendar('account-1', calendar);

    expect(result).toBe(false);
    expect(mocks.removeNtfyProviderSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: calendar.id,
        accountId: 'account-1',
        registrationUrl: '',
        pushResource: 'https://ntfy.sh/up-test-topic',
      }),
    );
    expect(mocks.db.upsertPushSubscription).not.toHaveBeenCalled();
    expect(mocks.startNtfyProviderListening).not.toHaveBeenCalled();
    expect(mocks.getSubscriptions()).toEqual([]);
  });

  it('summarizes stored registrations and runtime listener diagnostics by account', async () => {
    const stored = subscription('stored');
    const lastMessageAt = new Date('2026-06-01T12:00:00.000Z');
    mocks.setSubscriptions([stored]);
    mocks.getNtfyProviderSubscriptionDiagnostics.mockReturnValue({
      calendarId: calendar.id,
      providerId: NTFY_DIRECT_PROVIDER_ID,
      listening: true,
      listenerStartedAt: new Date('2026-06-01T11:00:00.000Z'),
      lastConnectedAt: new Date('2026-06-01T11:00:01.000Z'),
      lastMessageAt,
      receivedMessages: 2,
      lastError: null,
      lastErrorAt: null,
    });

    const diagnostics = await getWebDAVPushAccountDiagnostics(account);

    expect(diagnostics).toMatchObject({
      accountId: 'account-1',
      supportedCalendars: 1,
      registeredCalendars: 1,
      listeningCalendars: 1,
      expiringSoonCalendars: 0,
      lastMessageAt,
      lastError: null,
    });
    expect(diagnostics.lastRenewedAt).toEqual(stored.createdAt);
  });
});
