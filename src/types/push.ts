/**
 * push endpoint provider used to receive Web Push-compatible messages
 */
export const NTFY_DIRECT_PROVIDER_ID = 'ntfy-direct';
export const KUNIFIED_PUSH_PROVIDER_ID = 'kunifiedpush';
export type PushProviderId = typeof NTFY_DIRECT_PROVIDER_ID | typeof KUNIFIED_PUSH_PROVIDER_ID;

/**
 * ntfy server configuration
 */
export interface NtfyProviderConfig {
  /** ntfy server URL (default: https://ntfy.sh) */
  serverUrl: string;
  /**
   * topic prefix for generating UnifiedPush topics
   * must be "up" for ntfy subscriber-based rate limiting
   */
  topicPrefix: string;
}

export interface PushProviderConfig {
  providerId: PushProviderId;
  ntfyConfig?: NtfyProviderConfig;
}

/**
 * callback fired when a local push provider receives a message for a calendar
 */
export type PushMessageHandler = (calendarId: string, message: string) => void;

/**
 * supported trigger types for WebDAV Push
 */
export interface PushTrigger {
  type: 'content-update' | 'property-update';
  depth: '0' | '1' | 'infinity';
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
  /** push service endpoint URL */
  pushResource: string;
  /** local provider used to create/listen to this push resource */
  providerId: PushProviderId;
  /** provider-specific registration token, if the provider needs one */
  providerToken?: string;
  /** provider-specific distributor/service that owns the token, if applicable */
  providerDistributor?: string;
  /** when the subscription expires */
  expiresAt: Date;
  /** when the subscription was created locally */
  createdAt: Date;
}

/**
 * runtime state for a local provider listener
 */
export interface PushProviderSubscriptionDiagnostics {
  calendarId: string;
  providerId: PushProviderId;
  listening: boolean;
  listenerStartedAt: Date | null;
  lastConnectedAt: Date | null;
  lastMessageAt: Date | null;
  receivedMessages: number;
  lastError: string | null;
  lastErrorAt: Date | null;
}

/**
 * account-level WebDAV Push health summary
 */
export interface WebDAVPushAccountDiagnostics {
  accountId: string;
  supportedCalendars: number;
  registeredCalendars: number;
  listeningCalendars: number;
  expiringSoonCalendars: number;
  lastRenewedAt: Date | null;
  lastMessageAt: Date | null;
  lastError: string | null;
  lastErrorAt: Date | null;
}

/**
 * Web Push subscription details (client-to-server)
 */
export interface WebPushSubscription {
  /** push endpoint URL (from push service) */
  pushResource: string;
  /** client's ECDH public key for message encryption (base64url, uncompressed P-256) */
  subscriptionPublicKey: string;
  /** authentication secret for message encryption (base64url) */
  authSecret: string;
  /** content encoding (currently only aes128gcm) */
  contentEncoding: 'aes128gcm';
}

/**
 * Web Push subscription plus local provider metadata needed for restore
 */
export interface PushEndpointSubscription extends WebPushSubscription {
  providerId: PushProviderId;
  providerToken?: string;
  providerDistributor?: string;
}

/**
 * Web Push key pair for message encryption
 */
export interface WebPushKeyPair {
  /** public key (base64url, uncompressed P-256) */
  publicKey: string;
  /** private key (base64url) - kept locally for decryption */
  privateKey: string;
  /** authentication secret (base64url) */
  authSecret: string;
}

/**
 * registered push subscription (server response)
 */
export interface PushRegistration {
  /** URL to manage/delete this subscription */
  registrationUrl: string;
  /** when the subscription expires */
  expires: Date;
}
