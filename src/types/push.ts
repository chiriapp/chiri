/**
 * Push endpoint provider used to receive Web Push-compatible messages.
 */
export const NTFY_DIRECT_PROVIDER_ID = 'ntfy-direct';
export const LINUX_UNIFIED_PUSH_PROVIDER_ID = 'linux-unifiedpush';
export type PushProviderId = typeof NTFY_DIRECT_PROVIDER_ID | typeof LINUX_UNIFIED_PUSH_PROVIDER_ID;

/**
 * Callback fired when a local push provider receives a message for a calendar.
 */
export type PushMessageHandler = (calendarId: string, message: string) => void;

/**
 * Supported push transports
 */
export type PushTransport = 'web-push';

/**
 * Supported trigger types for WebDAV Push
 */
export interface PushTrigger {
  type: 'content-update' | 'property-update';
  depth: '0' | '1' | 'infinity';
}

export interface PushStatus {
  totalCalendars: number;
  pushSupportedCalendars: number;
  activeSubscriptions: number;
  expiringSubscriptions: number;
}

/**
 * WebDAV Push subscription stored locally
 */
export interface PushSubscription {
  id: string;
  calendarId: string;
  accountId: string;
  /** URL to manage/delete this subscription on the server */
  registrationUrl: string;
  /** Push service endpoint URL */
  pushResource: string;
  /** Local provider used to create/listen to this push resource */
  providerId: PushProviderId;
  /** Provider-specific registration token, if the provider needs one */
  providerToken?: string;
  /** When the subscription expires */
  expiresAt: Date;
  /** When the subscription was created locally */
  createdAt: Date;
}

/**
 * Web Push subscription details (client-to-server)
 */
export interface WebPushSubscription {
  /** Push endpoint URL (from push service) */
  pushResource: string;
  /** Client's ECDH public key for message encryption (base64url, uncompressed P-256) */
  subscriptionPublicKey: string;
  /** Authentication secret for message encryption (base64url) */
  authSecret: string;
  /** Content encoding (currently only aes128gcm) */
  contentEncoding: 'aes128gcm';
}

/**
 * Web Push subscription plus local provider metadata needed for restore.
 */
export interface PushEndpointSubscription extends WebPushSubscription {
  providerId: PushProviderId;
  providerToken?: string;
}

/**
 * Push capabilities advertised by a resource
 */
export interface PushCapabilities {
  /** Whether WebDAV Push is supported */
  supported: boolean;
  /** Unique topic identifier for WebDAV Push messages */
  topic?: string;
  /** Available push transports */
  transports: PushTransport[];
  /** VAPID public key for Web Push (base64url, uncompressed P-256) */
  vapidPublicKey?: string;
  /** Supported trigger types */
  supportedTriggers: PushTrigger[];
}

/**
 * Registered push subscription (server response)
 */
export interface PushRegistration {
  /** URL to manage/delete this subscription */
  registrationUrl: string;
  /** When the subscription expires */
  expires: Date;
}
