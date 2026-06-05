/**
 * Push endpoint provider used to receive Web Push-compatible messages.
 */
export const NTFY_DIRECT_PROVIDER_ID = 'ntfy-direct';
export const KUNIFIED_PUSH_PROVIDER_ID = 'kunifiedpush';
export type PushProviderId = typeof NTFY_DIRECT_PROVIDER_ID | typeof KUNIFIED_PUSH_PROVIDER_ID;

/**
 * ntfy server configuration.
 */
export interface NtfyProviderConfig {
  /** ntfy server URL (default: https://ntfy.sh) */
  serverUrl: string;
  /**
   * Topic prefix for generating UnifiedPush topics.
   * Must be "up" for ntfy subscriber-based rate limiting.
   */
  topicPrefix: string;
}

export interface PushProviderConfig {
  providerId: PushProviderId;
  ntfyConfig?: NtfyProviderConfig;
}

/**
 * Callback fired when a local push provider receives a message for a calendar.
 */
export type PushMessageHandler = (calendarId: string, message: string) => void;

/**
 * Supported trigger types for WebDAV Push
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
 * Runtime state for a local provider listener.
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
 * Account-level WebDAV Push health summary.
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
 * Web Push key pair for message encryption.
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
 * Registered push subscription (server response)
 */
export interface PushRegistration {
  /** URL to manage/delete this subscription */
  registrationUrl: string;
  /** When the subscription expires */
  expires: Date;
}
