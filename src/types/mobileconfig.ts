/** the container format Chiri decoded the configuration profile from */
export type MobileConfigFormat = 'xml' | 'binary-plist' | 'signed-cms';

/** Chiri can currently identify CMS signatures, but does not verify their trust chain */
export type MobileConfigSignatureStatus = 'unsigned' | 'signed-unverified';

export type MobileConfigDecodeFailureReason =
  | 'file-too-large'
  | 'invalid-profile'
  | 'invalid-cms'
  | 'encrypted-profile-unsupported'
  | 'missing-payload-content'
  | 'missing-caldav-payload'
  | 'invalid-caldav-payload'
  | 'unexpected-error';

/** a structurally decoded com.apple.caldav.account payload */
export interface DecodedMobileConfigCalDAVPayload {
  accountDescription?: string;
  hostname?: string;
  port?: number;
  useSSL?: boolean;
  username?: string;
  password?: string;
  principalUrl?: string;
  payloadIdentifier?: string;
  payloadUuid?: string;
}

export interface DecodedMobileConfig {
  format: MobileConfigFormat;
  signature: MobileConfigSignatureStatus;
  caldavPayloads: DecodedMobileConfigCalDAVPayload[];
}

export type MobileConfigDecodeResult =
  | { ok: true; profile: DecodedMobileConfig }
  | { ok: false; reason: MobileConfigDecodeFailureReason };

/** account setup values produced from a decoded CalDAV payload */
export interface MobileConfigCalDAVSettings {
  accountName?: string;
  serverUrl: string;
  username?: string;
  password?: string;
  principalUrl?: string;
  payloadIdentifier?: string;
  payloadUuid?: string;
  serverType: 'generic';
}

export type MobileConfigImportFailureReason =
  | MobileConfigDecodeFailureReason
  | 'missing-hostname'
  | 'invalid-hostname'
  | 'invalid-port'
  | 'invalid-principal-url';

export type MobileConfigImportResult =
  | {
      ok: true;
      format: MobileConfigFormat;
      signature: MobileConfigSignatureStatus;
      candidates: MobileConfigCalDAVSettings[];
    }
  | { ok: false; reason: MobileConfigImportFailureReason };

export type MobileConfigImportProfile = Extract<MobileConfigImportResult, { ok: true }>;

export interface MobileConfigImportSelection {
  format: MobileConfigFormat;
  signature: MobileConfigSignatureStatus;
  settings: MobileConfigCalDAVSettings;
}

export type MobileConfigExportIneligibleReason = 'local-account' | 'invalid-server-url';

export type MobileConfigCredentialWarning = 'oauth-token-may-expire';

export type MobileConfigExportEligibility =
  | { eligible: true }
  | { eligible: false; reason: MobileConfigExportIneligibleReason };

export type MobileConfigExportResult = 'saved' | 'downloaded' | 'cancelled';

export interface MobileConfigGenerationOptions {
  includePassword?: boolean;
  profileUuid?: string;
  payloadUuid?: string;
}
