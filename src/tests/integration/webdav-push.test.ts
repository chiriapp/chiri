import {
  createServer as createHttpServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fetchCalendars } from '$lib/caldav/calendars';
import { connect } from '$lib/caldav/connection';
import { registerPushSubscription, unregisterPushSubscription } from '$lib/caldav/push';
import { createTask, deleteTask } from '$lib/caldav/tasks';
import { generateWebPushKeyPair } from '$lib/push/keys';
import type { Calendar, Task } from '$types';
import { makeTask } from '../fixtures';
import {
  calendarHomeOverride,
  clearCalendarTasks,
  credentials,
  getOrCreateTestCalendar,
  hasIntegrationEnv,
  password,
  serverType,
  url,
  username,
} from './helpers';

const integration =
  hasIntegrationEnv && (serverType === 'rustical' || serverType === 'nextcloud')
    ? describe
    : describe.skip;

const TEST_CALENDAR_NAME = 'chiri-test-webdav-push';

const TEST_SERVER_CERT = `-----BEGIN CERTIFICATE-----
MIIBdzCCAR2gAwIBAgIJAL3Cgz1gRFBVMAoGCCqGSM49BAMCMCExHzAdBgNVBAMM
FkNoaXJpIERBViBQdXNoIFRlc3QgQ0EwHhcNMjYwNTI2MTU0ODI0WhcNMzYwNTIz
MTU0ODI0WjAUMRIwEAYDVQQDDAkxMjcuMC4wLjEwWTATBgcqhkjOPQIBBggqhkjO
PQMBBwNCAASHYdbkj0mZk32Ejl/YPvRnZ7OwRW4RItinpAcMEzfhq2fQpIKqCz0i
rWsQfddL0CSC0eh35n7Yv4bYv2KqeXPCo0swSTAaBgNVHREEEzARhwR/AAABggls
b2NhbGhvc3QwCQYDVR0TBAIwADALBgNVHQ8EBAMCBaAwEwYDVR0lBAwwCgYIKwYB
BQUHAwEwCgYIKoZIzj0EAwIDSAAwRQIgJCXECxt7dSPOEG5G4aQV5fvfy/TLlX92
MRtepHjKcAQCIQDuTTGGaYV5HHLiV/a4W7/vHKvDqeoTF4O6pXAU3N0KXw==
-----END CERTIFICATE-----`;

const TEST_SERVER_KEY = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIC1Xm3sMXCUtoOsvmTk9gcr/WXC4ZKJxy7TKQ7LSLnRsoAoGCCqGSM49
AwEHoUQDQgAEh2HW5I9JmZN9hI5f2D70Z2ezsEVuESLYp6QHDBM34atn0KSCqgs9
Iq1rEH3XS9AkgtHod+Z+2L+G2L9iqnlzwg==
-----END EC PRIVATE KEY-----`;

interface PushRequest {
  method?: string;
  url?: string;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

const startPushEndpoint = async (protocol: 'http' | 'https') => {
  const received: PushRequest[] = [];
  const waiters: {
    resolve: (request: PushRequest) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }[] = [];

  const handleRequest = (request: IncomingMessage, response: ServerResponse) => {
    const chunks: Buffer[] = [];

    request.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    request.on('end', () => {
      const pushRequest: PushRequest = {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: Buffer.concat(chunks),
      };
      const waiter = waiters.shift();
      if (waiter) {
        clearTimeout(waiter.timeout);
        waiter.resolve(pushRequest);
      } else {
        received.push(pushRequest);
      }

      response.writeHead(201);
      response.end();
    });
  };

  const server =
    protocol === 'https'
      ? createHttpsServer({ cert: TEST_SERVER_CERT, key: TEST_SERVER_KEY }, handleRequest)
      : createHttpServer(handleRequest);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const { port } = server.address() as AddressInfo;

  const waitForPush = (timeoutMs = 25_000): Promise<PushRequest> => {
    const request = received.shift();
    if (request) return Promise.resolve(request);

    return new Promise((resolve, reject) => {
      const waiter = {
        resolve,
        reject,
        timeout: setTimeout(() => {
          const index = waiters.indexOf(waiter);
          if (index >= 0) waiters.splice(index, 1);
          reject(new Error('Timed out waiting for WebDAV Push callback'));
        }, timeoutMs),
      };
      waiters.push(waiter);
    });
  };

  const close = async () => {
    for (const waiter of waiters.splice(0)) {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error('Push endpoint closed'));
    }
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  };

  return {
    endpoint: `${protocol}://127.0.0.1:${port}/push`,
    waitForPush,
    close,
  };
};

integration('WebDAV Push integration (RustiCal/Nextcloud)', () => {
  let calendarHome: string;
  let serverUrl: string;
  let testCalendar: Calendar;

  const conn = () => ({
    serverUrl,
    credentials,
    principalUrl: calendarHome,
    calendarHome,
    serverType,
  });

  beforeAll(async () => {
    const result = await connect(
      'push-acct',
      url!,
      username!,
      password!,
      serverType,
      calendarHomeOverride,
    );
    calendarHome = result.calendarHome;
    serverUrl = url!.replace(/\/$/, '');

    testCalendar = await getOrCreateTestCalendar(conn(), 'push-acct', TEST_CALENDAR_NAME);
    await clearCalendarTasks(conn(), 'push-acct', testCalendar);
  }, 30_000);

  afterAll(async () => {
    if (testCalendar) await clearCalendarTasks(conn(), 'push-acct', testCalendar);
  }, 30_000);

  it('discovers WebDAV Push support on calendars', async () => {
    const calendars = await fetchCalendars(conn(), 'push-acct');
    const discovered = calendars.find((calendar) => calendar.url === testCalendar.url);

    expect(discovered?.pushSupported).toBe(true);
    expect(discovered?.pushTopic).toBeTruthy();
  }, 30_000);

  it('registers a subscription and receives a push callback after a VTODO change', async () => {
    const pushEndpoint = await startPushEndpoint(serverType === 'nextcloud' ? 'https' : 'http');
    let registrationUrl: string | undefined;
    let createdTask: (Task & { href: string; etag?: string }) | undefined;
    let settlePushReceived: Promise<void> | undefined;

    try {
      const keyPair = await generateWebPushKeyPair();
      const registration = await registerPushSubscription(
        testCalendar.url,
        credentials,
        {
          pushResource: pushEndpoint.endpoint,
          subscriptionPublicKey: keyPair.publicKey,
          authSecret: keyPair.authSecret,
          contentEncoding: 'aes128gcm',
        },
        [{ type: 'content-update', depth: '1' }],
        new Date(Date.now() + 60 * 60 * 1000),
      );

      expect(registration).not.toBeNull();
      registrationUrl = registration!.registrationUrl;
      const registrationPath = new URL(registrationUrl).pathname;
      if (serverType === 'nextcloud') {
        expect(registrationPath).toMatch(/^\/apps\/dav_push\/subscriptions\//);
      } else {
        expect(registrationPath).toMatch(/^\/push_subscription\//);
      }

      const pushReceived = pushEndpoint.waitForPush();
      settlePushReceived = pushReceived.then(
        () => undefined,
        () => undefined,
      );
      const task = makeTask({
        uid: `push-integration-${Date.now()}`,
        title: 'WebDAV Push integration task',
        accountId: 'push-acct',
        calendarId: testCalendar.id,
      });
      const created = await createTask(conn(), testCalendar, task);
      expect(created).not.toBeNull();
      createdTask = { ...task, href: created!.href, etag: created!.etag };

      const request = await pushReceived;
      expect(request.method).toBe('POST');
      expect(request.url).toBe('/push');
      expect(request.body.byteLength).toBeGreaterThan(0);
      expect(request.headers['content-encoding']).toBe('aes128gcm');
    } finally {
      if (createdTask) await deleteTask(conn(), createdTask);
      if (registrationUrl) await unregisterPushSubscription(registrationUrl, credentials);
      await pushEndpoint.close();
      await settlePushReceived;
    }
  }, 35_000);
});
