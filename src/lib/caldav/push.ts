/**
 * WebDAV Push Support
 *
 * Implements WebDAV-Push draft specification for near real-time sync notifications.
 * https://github.com/bitfireAT/webdav-push
 *
 * This module provides:
 * - Push subscription registration via POST
 * - Push subscription removal via DELETE
 */

import { log } from '$lib/caldav/utils';
import { type CalDAVCredentials, tauriRequest } from '$lib/tauriHttp';
import type { PushRegistration, PushTrigger, WebPushSubscription } from '$types/push';

// WebDAV Push XML namespace
export const NS_WEBDAV_PUSH = 'https://bitfire.at/webdav-push';

/**
 * Build push-register XML body
 */
const buildPushRegisterXml = (
  subscription: WebPushSubscription,
  triggers: PushTrigger[],
  expiresAt?: Date,
) => {
  const triggerElements = triggers
    .map((trigger) => {
      if (trigger.type === 'content-update') {
        return `      <P:content-update>
        <d:depth>${trigger.depth}</d:depth>
      </P:content-update>`;
      } else {
        return `      <P:property-update>
        <d:depth>${trigger.depth}</d:depth>
      </P:property-update>`;
      }
    })
    .join('\n');

  const expiresElement = expiresAt ? `    <P:expires>${expiresAt.toUTCString()}</P:expires>\n` : '';

  return `<?xml version="1.0" encoding="utf-8"?>
<P:push-register xmlns:d="DAV:" xmlns:P="${NS_WEBDAV_PUSH}">
  <P:subscription>
    <P:web-push-subscription>
      <P:push-resource>${subscription.pushResource}</P:push-resource>
      <P:subscription-public-key type="p256dh">${subscription.subscriptionPublicKey}</P:subscription-public-key>
      <P:auth-secret>${subscription.authSecret}</P:auth-secret>
      <P:content-encoding>${subscription.contentEncoding}</P:content-encoding>
    </P:web-push-subscription>
  </P:subscription>
  <P:trigger>
${triggerElements}
  </P:trigger>
${expiresElement}</P:push-register>`;
};

/**
 * Parse push registration response
 */
const parsePushRegistrationResponse = (
  headers: Record<string, string>,
): Omit<PushRegistration, 'registrationUrl'> | null => {
  const expiresHeader = headers.expires || headers.Expires;
  if (!expiresHeader) {
    log.warn('Push registration response missing Expires header');
    return null;
  }

  // Clean up the header value - some servers (e.g., Nextcloud) may add trailing characters
  // e.g., "Fri, 10 Apr 2026 14:29:29 +0000+" -> "Fri, 10 Apr 2026 14:29:29 +0000"
  const cleanedHeader = expiresHeader.replace(/\+$/, '').trim();

  const expires = new Date(cleanedHeader);
  if (Number.isNaN(expires.getTime())) {
    log.warn(`Invalid Expires header value: ${expiresHeader}`);
    return null;
  }

  return { expires };
};

/**
 * Register a push subscription for a resource
 *
 * Sends a POST request with push-register XML body to subscribe
 * to WebDAV Push for the specified resource.
 *
 * @param resourceUrl - URL of the resource to subscribe to (e.g., calendar URL)
 * @param credentials - CalDAV credentials
 * @param subscription - Web Push subscription details
 * @param triggers - Types of updates to subscribe to
 * @param expiresAt - Optional requested expiration time
 * @returns Registration details including management URL and actual expiration
 */
export const registerPushSubscription = async (
  resourceUrl: string,
  credentials: CalDAVCredentials,
  subscription: WebPushSubscription,
  triggers: PushTrigger[],
  expiresAt?: Date,
): Promise<PushRegistration | null> => {
  const body = buildPushRegisterXml(subscription, triggers, expiresAt);

  log.info(`Registering push subscription for ${resourceUrl}`);

  try {
    const response = await tauriRequest(resourceUrl, 'POST', credentials, body, {
      'Content-Type': 'application/xml; charset=utf-8',
    });

    if (response.status !== 201 && response.status !== 204) {
      log.error(`Push registration failed: HTTP ${response.status}`);
      log.debug('Response body:', response.body);
      return null;
    }

    const registrationLocation = response.headers.location || response.headers.Location;
    if (!registrationLocation) {
      log.error('Push registration response missing Location header');
      return null;
    }
    let registrationUrl: string;
    try {
      registrationUrl = new URL(registrationLocation, resourceUrl).toString();
    } catch {
      log.error(`Invalid push registration Location header: ${registrationLocation}`);
      return null;
    }

    const parsed = parsePushRegistrationResponse(response.headers);
    if (!parsed) {
      return null;
    }

    log.info(`Push subscription registered, expires: ${parsed.expires.toISOString()}`);
    return {
      registrationUrl,
      expires: parsed.expires,
    };
  } catch (error) {
    log.error('Error registering push subscription:', error);
    return null;
  }
};

/**
 * Unregister a push subscription
 *
 * Sends a DELETE request to the registration URL to remove the subscription.
 */
export const unregisterPushSubscription = async (
  registrationUrl: string,
  credentials: CalDAVCredentials,
) => {
  log.info(`Unregistering push subscription: ${registrationUrl}`);

  try {
    const response = await tauriRequest(registrationUrl, 'DELETE', credentials);

    if (response.status === 204 || response.status === 200 || response.status === 404) {
      log.info('Push subscription unregistered');
      return true;
    }

    log.error(`Push unregistration failed: HTTP ${response.status}`);
    return false;
  } catch (error) {
    log.error('Error unregistering push subscription:', error);
    return false;
  }
};
