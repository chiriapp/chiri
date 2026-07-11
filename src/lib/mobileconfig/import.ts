import { decodeMobileConfig } from '$lib/mobileconfig/decode';
import type {
  DecodedMobileConfig,
  DecodedMobileConfigCalDAVPayload,
  MobileConfigCalDAVSettings,
  MobileConfigImportFailureReason,
  MobileConfigImportResult,
} from '$types/mobileconfig';

type PayloadMappingResult =
  | { ok: true; settings: MobileConfigCalDAVSettings }
  | { ok: false; reason: MobileConfigImportFailureReason };

const trimOptional = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed || undefined;
};

const mapServerUrl = (
  payload: DecodedMobileConfigCalDAVPayload,
): { ok: true; serverUrl: string } | { ok: false; reason: MobileConfigImportFailureReason } => {
  const hostname = trimOptional(payload.hostname);
  if (!hostname) return { ok: false, reason: 'missing-hostname' };

  if (
    payload.port !== undefined &&
    (!Number.isInteger(payload.port) || payload.port < 1 || payload.port > 65535)
  ) {
    return { ok: false, reason: 'invalid-port' };
  }

  if (
    hostname.includes('/') ||
    hostname.includes('?') ||
    hostname.includes('#') ||
    hostname.includes('@')
  ) {
    return { ok: false, reason: 'invalid-hostname' };
  }

  const scheme = payload.useSSL === false ? 'http' : 'https';
  const isUnbracketedIpv6 = hostname.split(':').length > 2 && !hostname.startsWith('[');
  const authority = isUnbracketedIpv6 ? `[${hostname}]` : hostname;

  try {
    const url = new URL(`${scheme}://${authority}`);
    if (!url.hostname || url.username || url.password) {
      return { ok: false, reason: 'invalid-hostname' };
    }

    if (payload.port !== undefined) {
      if (url.port && Number(url.port) !== payload.port) {
        return { ok: false, reason: 'invalid-port' };
      }
      url.port = String(payload.port);
    }

    return { ok: true, serverUrl: url.origin };
  } catch {
    return { ok: false, reason: 'invalid-hostname' };
  }
};

const mapPrincipalUrl = (
  principalUrl: string | undefined,
  serverUrl: string,
): { ok: true; principalUrl?: string } | { ok: false; reason: 'invalid-principal-url' } => {
  const value = trimOptional(principalUrl);
  if (!value) return { ok: true };
  if (value.startsWith('//')) return { ok: false, reason: 'invalid-principal-url' };

  try {
    const resolved = new URL(value, serverUrl);
    if (
      !['http:', 'https:'].includes(resolved.protocol) ||
      resolved.username ||
      resolved.password
    ) {
      return { ok: false, reason: 'invalid-principal-url' };
    }
    return { ok: true, principalUrl: value };
  } catch {
    return { ok: false, reason: 'invalid-principal-url' };
  }
};

const mapPayload = (payload: DecodedMobileConfigCalDAVPayload): PayloadMappingResult => {
  const server = mapServerUrl(payload);
  if (!server.ok) return server;

  const principal = mapPrincipalUrl(payload.principalUrl, server.serverUrl);
  if (!principal.ok) return principal;

  const username = trimOptional(payload.username);
  const payloadIdentifier = trimOptional(payload.payloadIdentifier);
  const payloadUuid = trimOptional(payload.payloadUuid);
  return {
    ok: true,
    settings: {
      accountName: trimOptional(payload.accountDescription) ?? username,
      serverUrl: server.serverUrl,
      username,
      password: payload.password,
      principalUrl: principal.principalUrl,
      ...(payloadIdentifier ? { payloadIdentifier } : {}),
      ...(payloadUuid ? { payloadUuid } : {}),
      serverType: 'generic',
    },
  };
};

/** validate and map every decoded CalDAV payload into Chiri's account setup shape */
export const mapDecodedMobileConfig = (profile: DecodedMobileConfig): MobileConfigImportResult => {
  const candidates: MobileConfigCalDAVSettings[] = [];
  for (const payload of profile.caldavPayloads) {
    const mapped = mapPayload(payload);
    if (!mapped.ok) return mapped;
    candidates.push(mapped.settings);
  }

  if (candidates.length === 0) return { ok: false, reason: 'missing-caldav-payload' };

  return {
    ok: true,
    format: profile.format,
    signature: profile.signature,
    candidates,
  };
};

/** decode, validate, and map a configuration profile's CalDAV accounts */
export const importMobileConfig = async (bytes: Uint8Array): Promise<MobileConfigImportResult> => {
  const decoded = await decodeMobileConfig(bytes);
  return decoded.ok ? mapDecodedMobileConfig(decoded.profile) : decoded;
};
