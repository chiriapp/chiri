import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalDAVCredentials, HttpResponse } from '$lib/http';

vi.mock('$lib/http', () => ({
  tauriRequest: vi.fn(),
}));
vi.mock('$lib/caldav/utils', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { registerPushSubscription } from '$lib/caldav/push';
import * as http from '$lib/http';

const response = (headers: Record<string, string>): HttpResponse => ({
  status: 201,
  headers,
  body: '',
});

describe('registerPushSubscription', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves a relative Location header against the calendar resource URL', async () => {
    vi.mocked(http.tauriRequest).mockResolvedValueOnce(
      response({
        location: '/push_subscription/sub-1',
        expires: new Date(Date.now() + 72 * 60 * 60 * 1000).toUTCString(),
      }),
    );

    const credentials: CalDAVCredentials = {
      username: 'unit-tests',
      password: 'unit-tests',
    };

    const registration = await registerPushSubscription(
      'http://localhost:4000/caldav/principal/unit-tests/default/',
      credentials,
      {
        pushResource: 'https://ntfy.sh/up-test-topic',
        subscriptionPublicKey: 'public-key',
        authSecret: 'auth-secret',
        contentEncoding: 'aes128gcm',
      },
      [{ type: 'content-update', depth: '1' }],
    );

    expect(registration?.registrationUrl).toBe('http://localhost:4000/push_subscription/sub-1');
  });
});
