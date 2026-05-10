/**
 * WebDAV Push Support
 *
 * Implements WebDAV-Push draft specification for near real-time sync notifications.
 * https://github.com/bitfireAT/webdav-push
 *
 * This module provides:
 * - Push support detection via PROPFIND
 * - Push subscription registration via POST
 * - Push subscription management (renewal, removal)
 */

import type { Connection } from '$lib/caldav/connection';
import { log } from '$lib/caldav/utils';
import { type CalDAVCredentials, propfind, tauriRequest } from '$lib/tauri-http';
import type {
  PushCapabilities,
  PushRegistration,
  PushTrigger,
  WebPushSubscription,
} from '$types/push';

// WebDAV Push XML namespace
export const NS_WEBDAV_PUSH = 'https://bitfire.at/webdav-push';

/**
 * Parse push capabilities from PROPFIND response
 */
const parsePushCapabilities = (xml: string): PushCapabilities => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  const capabilities: PushCapabilities = {
    supported: false,
    transports: [],
    supportedTriggers: [],
  };

  // Check for topic element (indicates push support)
  const topicEl = doc.querySelector('topic');
  if (topicEl?.textContent) {
    capabilities.supported = true;
    capabilities.topic = topicEl.textContent.trim();
  }

  // Parse transports
  const transportsEl = doc.querySelector('transports');
  if (transportsEl) {
    // Check for web-push transport
    const webPushEl = transportsEl.querySelector('web-push');
    if (webPushEl) {
      capabilities.transports.push('web-push');

      // Extract VAPID public key if present
      const vapidKeyEl = webPushEl.querySelector('vapid-public-key');
      if (vapidKeyEl?.textContent) {
        capabilities.vapidPublicKey = vapidKeyEl.textContent.trim();
      }
    }
  }

  // Parse supported triggers
  const triggersEl = doc.querySelector('supported-triggers');
  if (triggersEl) {
    const contentUpdateEl = triggersEl.querySelector('content-update');
    if (contentUpdateEl) {
      const depthEl = contentUpdateEl.querySelector('depth');
      const depth = (depthEl?.textContent?.trim() as '0' | '1' | 'infinity') || '1';
      capabilities.supportedTriggers.push({ type: 'content-update', depth });
    }

    const propertyUpdateEl = triggersEl.querySelector('property-update');
    if (propertyUpdateEl) {
      const depthEl = propertyUpdateEl.querySelector('depth');
      const depth = (depthEl?.textContent?.trim() as '0' | '1' | 'infinity') || '0';
      capabilities.supportedTriggers.push({ type: 'property-update', depth });
    }
  }

  return capabilities;
};

/**
 * Quick server-level WebDAV Push detection via OPTIONS.
 *
 * The spec requires servers that support WebDAV Push to include "webdav-push"
 * in the DAV header of OPTIONS responses. This is cheaper than a PROPFIND and
 * can be used to skip push subscriptions entirely for non-supporting servers.
 *
 * Returns false on any error (network failure, unexpected response, etc.).
 */
export const checkPushSupportViaOptions = async (url: string, credentials: CalDAVCredentials) => {
  try {
    const response = await tauriRequest(url, 'OPTIONS', credentials);
    const davHeader = response.headers.dav ?? response.headers.DAV ?? '';
    return davHeader
      .split(',')
      .map((s) => s.trim())
      .includes('webdav-push');
  } catch {
    return false;
  }
};

/**
 * Check if a resource supports WebDAV Push
 *
 * Performs a PROPFIND request to check for push-related properties:
 * - transports: available push transports (e.g., web-push)
 * - topic: unique identifier for WebDAV Push messages
 * - supported-triggers: types of changes that can trigger messages
 */
export const checkPushSupport = async (
  url: string,
  credentials: CalDAVCredentials,
): Promise<PushCapabilities> => {
  const propfindBody = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:P="${NS_WEBDAV_PUSH}">
  <d:prop>
    <P:transports/>
    <P:topic/>
    <P:supported-triggers/>
  </d:prop>
</d:propfind>`;

  try {
    const response = await propfind(url, credentials, propfindBody, '0');

    if (response.status !== 207) {
      log.debug(`Push support check failed for ${url}: HTTP ${response.status}`);
      return { supported: false, transports: [], supportedTriggers: [] };
    }

    return parsePushCapabilities(response.body);
  } catch (error) {
    log.warn(`Error checking push support for ${url}:`, error);
    return { supported: false, transports: [], supportedTriggers: [] };
  }
};

/**
 * Build push-register XML body
 */
const buildPushRegisterXml = (
  subscription: WebPushSubscription,
  triggers: PushTrigger[],
  expiresAt?: Date,
): string => {
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

    const registrationUrl = response.headers.location || response.headers.Location;
    if (!registrationUrl) {
      log.error('Push registration response missing Location header');
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
): Promise<boolean> => {
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

/**
 * Check push support for a connection's calendar home
 */
export const checkPushSupportForConnection = async (
  conn: Connection,
): Promise<PushCapabilities> => {
  return checkPushSupport(conn.calendarHome, conn.credentials);
};

/**
 * Parse an incoming push message XML
 */
export interface PushMessage {
  topic: string;
  contentUpdate?: {
    syncToken?: string;
  };
  propertyUpdate?: boolean;
}

export const parsePushMessage = (xml: string): PushMessage | null => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');

    const pushMessageEl = doc.querySelector('push-message');
    if (!pushMessageEl) {
      log.warn('Invalid push message: missing push-message element');
      return null;
    }

    const topicEl = pushMessageEl.querySelector('topic');
    if (!topicEl?.textContent) {
      log.warn('Invalid push message: missing topic');
      return null;
    }

    const message: PushMessage = {
      topic: topicEl.textContent.trim(),
    };

    const contentUpdateEl = pushMessageEl.querySelector('content-update');
    if (contentUpdateEl) {
      message.contentUpdate = {};
      const syncTokenEl = contentUpdateEl.querySelector('sync-token');
      if (syncTokenEl?.textContent) {
        message.contentUpdate.syncToken = syncTokenEl.textContent.trim();
      }
    }

    const propertyUpdateEl = pushMessageEl.querySelector('property-update');
    if (propertyUpdateEl) {
      message.propertyUpdate = true;
    }

    return message;
  } catch (error) {
    log.error('Error parsing push message:', error);
    return null;
  }
};
