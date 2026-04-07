/**
 * UnifiedPush Provider Interface
 *
 * Provides push message reception for WebDAV Push on desktop.
 * Uses ntfy (https://ntfy.sh) as the UnifiedPush distributor.
 *
 * Architecture:
 * 1. Client generates ECDH key pair for message encryption
 * 2. Client subscribes to ntfy topic, gets push endpoint URL
 * 3. Client registers endpoint with CalDAV server
 * 4. Server sends encrypted push messages to ntfy
 * 5. ntfy forwards messages to client (via SSE/WebSocket)
 * 6. Client decrypts messages and triggers sync
 */

import { log } from '$lib/caldav/utils';
import type { Calendar } from '$types';

/**
 * ntfy server configuration
 */
export interface NtfyConfig {
  /** ntfy server URL (default: https://ntfy.sh) */
  serverUrl: string;
  /**
   * Topic prefix for generating UnifiedPush topics.
   * Must be "up" for ntfy subscriber-based rate limiting.
   */
  topicPrefix: string;
}

const DEFAULT_NTFY_CONFIG: NtfyConfig = {
  serverUrl: 'https://ntfy.sh',
  topicPrefix: 'up',
};

/**
 * Web Push key pair for message encryption
 */
export interface WebPushKeyPair {
  /** Public key (base64url, uncompressed P-256) */
  publicKey: string;
  /** Private key (base64url) - kept locally for decryption */
  privateKey: string;
  /** Authentication secret (base64url) */
  authSecret: string;
}

/**
 * Active push subscription with ntfy
 */
export interface NtfySubscription {
  /** ntfy topic */
  topic: string;
  /** Full push endpoint URL */
  endpoint: string;
  /** Key pair for encryption */
  keyPair: WebPushKeyPair;
  /** EventSource for receiving messages */
  eventSource?: EventSource;
}

// Store active subscriptions
const activeSubscriptions = new Map<string, NtfySubscription>();
let receivedMessageCount = 0;
let lastMessageAt: Date | null = null;

/**
 * Generate a Web Push key pair using the Web Crypto API
 *
 * This generates:
 * - P-256 ECDH key pair for message encryption
 * - Random auth secret for additional authentication
 */
export const generateWebPushKeyPair = async (): Promise<WebPushKeyPair> => {
  // Generate P-256 ECDH key pair
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['deriveBits'],
  );

  // Export public key in raw format (uncompressed point)
  const publicKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const publicKey = base64UrlEncode(new Uint8Array(publicKeyBuffer));

  // Export private key in PKCS8 format
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const privateKey = base64UrlEncode(new Uint8Array(privateKeyBuffer));

  // Generate random auth secret (16 bytes)
  const authSecretBuffer = crypto.getRandomValues(new Uint8Array(16));
  const authSecret = base64UrlEncode(authSecretBuffer);

  return {
    publicKey,
    privateKey,
    authSecret,
  };
};

/**
 * Base64URL encode without padding
 */
const base64UrlEncode = (data: Uint8Array): string => {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/**
 * Base64URL decode
 */
export const base64UrlDecode = (str: string): Uint8Array => {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binaryString = atob(base64 + padding);
  return Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
};

/**
 * Generate a unique ntfy topic for a calendar
 */
const generateNtfyTopic = (config: NtfyConfig = DEFAULT_NTFY_CONFIG): string => {
  // ntfy's UnifiedPush subscriber-based rate limiting expects topics that:
  // - start with "up"
  // - are exactly 14 chars long
  // See ntfy server constants: unifiedPushTopicPrefix="up", unifiedPushTopicLength=14
  const randomBytes = crypto.getRandomValues(new Uint8Array(9)); // 9 bytes -> 12 base64url chars
  const suffix = base64UrlEncode(randomBytes).slice(0, 12);
  return `${config.topicPrefix}${suffix}`;
};

/**
 * Create an ntfy subscription for a calendar
 */
export const createNtfySubscription = async (
  calendar: Calendar,
  config: NtfyConfig = DEFAULT_NTFY_CONFIG,
): Promise<NtfySubscription> => {
  // Check if already subscribed
  const existing = activeSubscriptions.get(calendar.id);
  if (existing) {
    log.debug(`Already subscribed to ntfy for calendar ${calendar.displayName}`);
    return existing;
  }

  // Generate key pair
  const keyPair = await generateWebPushKeyPair();

  // Generate unique topic
  const topic = generateNtfyTopic(config);
  const endpoint = `${config.serverUrl}/${topic}`;

  const subscription: NtfySubscription = {
    topic,
    endpoint,
    keyPair,
  };

  activeSubscriptions.set(calendar.id, subscription);
  log.info(`Created ntfy subscription for ${calendar.displayName}: ${endpoint}`);

  return subscription;
};

/**
 * Restore an ntfy subscription for a calendar using existing endpoint
 *
 * Used on app startup to reconnect to ntfy for existing push subscriptions.
 * Unlike createNtfySubscription, this uses the existing push resource URL
 * that's stored in the database rather than generating a new topic.
 *
 * Note: We don't have the original key pair, so we generate new ones.
 * This is fine because we're just listening for messages, not decrypting.
 * The CalDAV server sends the push message to ntfy, and ntfy just forwards
 * the raw message to us (ntfy doesn't do Web Push encryption).
 */
export const restoreNtfySubscription = async (
  calendarId: string,
  pushResource: string,
  calendarDisplayName: string,
): Promise<NtfySubscription | null> => {
  // Check if already subscribed
  const existing = activeSubscriptions.get(calendarId);
  if (existing) {
    log.debug(`Already subscribed to ntfy for calendar ${calendarDisplayName}`);
    return existing;
  }

  // Parse topic from push resource URL (e.g., "https://ntfy.sh/chiri-push-xyz" -> "chiri-push-xyz")
  let topic: string;
  try {
    const url = new URL(pushResource);
    topic = url.pathname.slice(1); // Remove leading slash
  } catch {
    log.error(`Invalid push resource URL: ${pushResource}`);
    return null;
  }

  // Generate new key pair (not used for listening, but required for the structure)
  const keyPair = await generateWebPushKeyPair();

  const subscription: NtfySubscription = {
    topic,
    endpoint: pushResource,
    keyPair,
  };

  activeSubscriptions.set(calendarId, subscription);
  log.info(`Restored ntfy subscription for ${calendarDisplayName}: ${pushResource}`);

  return subscription;
};

/**
 * Check if a calendar is currently listening for push messages
 */
export const isListening = (calendarId: string): boolean => {
  const subscription = activeSubscriptions.get(calendarId);
  return !!subscription?.eventSource;
};

/**
 * Message handler callback type
 */
export type PushMessageHandler = (calendarId: string, message: string) => void;

/**
 * Start listening for push messages on an ntfy subscription
 *
 * Uses Server-Sent Events (SSE) for real-time message delivery.
 */
export const startListening = (
  calendarId: string,
  onMessage: PushMessageHandler,
  config: NtfyConfig = DEFAULT_NTFY_CONFIG,
): boolean => {
  const subscription = activeSubscriptions.get(calendarId);
  if (!subscription) {
    log.warn(`No subscription found for calendar ${calendarId}`);
    return false;
  }

  if (subscription.eventSource) {
    log.debug(`Already listening for calendar ${calendarId}`);
    return true;
  }

  // Connect to ntfy via SSE
  const sseUrl = `${config.serverUrl}/${subscription.topic}/sse`;
  const eventSource = new EventSource(sseUrl);

  eventSource.onopen = () => {
    log.info(`Connected to ntfy SSE for topic ${subscription.topic}`);
  };

  eventSource.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      const messageLength = typeof data.message === 'string' ? data.message.length : 0;
      log.debug(
        `ntfy SSE event received (type=${data.event}, topic=${data.topic ?? subscription.topic}, encoding=${data.encoding ?? 'plain'}, messageBytes=${messageLength})`,
      );

      // ntfy message events can be:
      // - Plain text messages: { event: 'message', message: '...' }
      // - Binary/attachment messages: { event: 'message', attachment: {...} }
      // - Keepalive: { event: 'keepalive' }
      // - Open: { event: 'open' }
      if (data.event === 'message') {
        receivedMessageCount++;
        lastMessageAt = new Date();
        log.info(`Received push message for calendar ${calendarId}`);

        // For Web Push encrypted messages, the payload might be in:
        // - data.message (base64 if binary)
        // - data.attachment (binary attachment)
        // - data.encoding (indicates encoding, e.g., 'base64')
        //
        // For now, we trigger sync on ANY message receipt.
        // The mere receipt of a message indicates server-side changes.
        // Decryption of the actual content (topic, sync-token) would be nice
        // but is not required - the sync will discover the changes anyway.
        const messageContent =
          data.message || data.attachment?.name || 'WebDAV Push message received';
        onMessage(calendarId, messageContent);
      }
    } catch (error) {
      log.warn('Failed to parse ntfy message:', error);
      // Even if we can't parse, we received something - might be malformed push
    }
  };

  eventSource.onerror = (error) => {
    log.error(`ntfy SSE error for topic ${subscription.topic}:`, error);
    // EventSource will automatically reconnect
  };

  subscription.eventSource = eventSource;
  return true;
};

/**
 * Stop listening for push messages
 */
export const stopListening = (calendarId: string): void => {
  const subscription = activeSubscriptions.get(calendarId);
  if (subscription?.eventSource) {
    subscription.eventSource.close();
    subscription.eventSource = undefined;
    log.info(`Stopped listening for calendar ${calendarId}`);
  }
};

/**
 * Remove an ntfy subscription
 */
export const removeNtfySubscription = (calendarId: string): void => {
  stopListening(calendarId);
  activeSubscriptions.delete(calendarId);
  log.info(`Removed ntfy subscription for calendar ${calendarId}`);
};

/**
 * Get the push endpoint URL for a calendar's subscription
 */
export const getPushEndpoint = (calendarId: string): string | null => {
  return activeSubscriptions.get(calendarId)?.endpoint ?? null;
};

/**
 * Get the Web Push subscription details needed for CalDAV registration
 */
export const getWebPushSubscription = (
  calendarId: string,
): {
  pushResource: string;
  subscriptionPublicKey: string;
  authSecret: string;
  contentEncoding: 'aes128gcm';
} | null => {
  const subscription = activeSubscriptions.get(calendarId);
  if (!subscription) return null;

  return {
    pushResource: subscription.endpoint,
    subscriptionPublicKey: subscription.keyPair.publicKey,
    authSecret: subscription.keyPair.authSecret,
    contentEncoding: 'aes128gcm',
  };
};

/**
 * Check if ntfy is available and reachable
 */
export const checkNtfyAvailability = async (
  config: NtfyConfig = DEFAULT_NTFY_CONFIG,
): Promise<boolean> => {
  try {
    const response = await fetch(`${config.serverUrl}/v1/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Get count of active subscriptions
 */
export const getActiveSubscriptionCount = (): number => {
  return activeSubscriptions.size;
};

/**
 * Push diagnostics for debug UI/logging
 */
export interface PushDiagnostics {
  activeSubscriptions: number;
  receivedMessages: number;
  lastMessageAt: Date | null;
}

export const getPushDiagnostics = (): PushDiagnostics => {
  return {
    activeSubscriptions: activeSubscriptions.size,
    receivedMessages: receivedMessageCount,
    lastMessageAt,
  };
};

/**
 * Stop all active subscriptions
 */
export const stopAllSubscriptions = (): void => {
  for (const calendarId of activeSubscriptions.keys()) {
    stopListening(calendarId);
  }
  activeSubscriptions.clear();
  log.info('Stopped all ntfy subscriptions');
};
