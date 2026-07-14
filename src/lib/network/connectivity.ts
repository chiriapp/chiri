import { invoke } from '@tauri-apps/api/core';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { settingsStore } from '$context/settingsContext';
import { getNetworkProxyConfig, type HttpResponse } from '$lib/http';
import { loggers } from '$lib/logger';
import { getAllAccounts } from '$lib/store/accounts';

const log = loggers.connectivity;

export const DEFAULT_CONNECTIVITY_CHECK_URL = 'https://detectportal.firefox.com/success.txt';

export type ConnectivityProbeKind = 'caldav' | 'external';
export type ExternalFallbackType = 'default' | 'custom';

export interface ConnectivityProbeAttempt {
  kind: ConnectivityProbeKind;
  label: string;
  url: string;
  ok: boolean;
  error?: string;
}

export interface ConnectivityCheckResult {
  checkedAt: string;
  durationMs: number;
  online: boolean;
  source: ConnectivityProbeKind | 'none';
  accountsChecked: number;
  externalCheckUsed: boolean;
  externalFallbackType: ExternalFallbackType | null;
  attempts: ConnectivityProbeAttempt[];
  message: string;
}

interface ConnectivityCheckOptions {
  signal?: AbortSignal;
  externalCheckEnabled?: boolean;
  requestTimeoutMs?: number;
}

const resultListeners = new Set<() => void>();
const statusListeners = new Set<() => void>();
let lastConnectivityCheckResult: ConnectivityCheckResult | null = null;
let activeConnectivityCheckCount = 0;

export const subscribeConnectivityCheckResult = (listener: () => void) => {
  resultListeners.add(listener);
  return () => resultListeners.delete(listener);
};

export const getLastConnectivityCheckResult = () => lastConnectivityCheckResult;

export const subscribeConnectivityCheckStatus = (listener: () => void) => {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
};

export const getIsConnectivityCheckRunning = () => activeConnectivityCheckCount > 0;

const publishConnectivityCheckResult = (result: ConnectivityCheckResult) => {
  lastConnectivityCheckResult = result;
  for (const listener of resultListeners) listener();
};

const publishConnectivityCheckStatus = () => {
  for (const listener of statusListeners) listener();
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const getProbeSignal = (signal: AbortSignal | undefined, requestTimeoutMs: number) => {
  const timeoutSignal = AbortSignal.timeout(requestTimeoutMs);
  return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
};

const shouldUseRustHttp = () => {
  const proxyMode = getNetworkProxyConfig().mode;
  return proxyMode === 'none' || proxyMode === 'http' || proxyMode === 'socks';
};

const probeUrl = async (url: string, signal: AbortSignal | undefined, requestTimeoutMs: number) => {
  if (shouldUseRustHttp()) {
    if (signal?.aborted) throw new Error('Aborted');
    return invoke<HttpResponse>('http_request', {
      url,
      method: 'GET',
      headers: {},
      body: null,
      acceptInvalidCerts: false,
      proxyConfig: getNetworkProxyConfig(),
      timeoutMs: requestTimeoutMs,
    });
  }

  return tauriFetch(url, {
    method: 'GET',
    signal: getProbeSignal(signal, requestTimeoutMs),
  });
};

const tryUrl = async (
  kind: ConnectivityProbeKind,
  label: string,
  url: string,
  signal: AbortSignal | undefined,
  requestTimeoutMs: number,
): Promise<ConnectivityProbeAttempt> => {
  try {
    const response = await probeUrl(url, signal, requestTimeoutMs);
    return { kind, label, url, ok: response != null };
  } catch (error) {
    if (signal?.aborted) throw new Error('Aborted');
    return { kind, label, url, ok: false, error: getErrorMessage(error) };
  }
};

export const runConnectivityCheck = async ({
  signal,
  externalCheckEnabled = settingsStore.getState().connectivityCheckEnabled,
  requestTimeoutMs = settingsStore.getState().connectivityRequestTimeout * 1000,
}: ConnectivityCheckOptions = {}) => {
  activeConnectivityCheckCount += 1;
  publishConnectivityCheckStatus();
  const startedAt = Date.now();
  const attempts: ConnectivityProbeAttempt[] = [];
  const pendingLogs: string[] = [];
  let fallbackUrl: string | null = null;
  const accounts = getAllAccounts().filter((account) => account.isActive && account.caldav);

  const publishAndMaybeLog = (result: ConnectivityCheckResult) => {
    const previous = lastConnectivityCheckResult;
    const changed =
      !previous || previous.online !== result.online || previous.source !== result.source;
    if (changed) {
      for (const message of pendingLogs) {
        log.debug(message);
      }
      const fallbackSuffix = fallbackUrl ? ` (fallback: ${fallbackUrl})` : '';
      log.info(`Connectivity check: ${result.online ? 'online' : 'offline'}${fallbackSuffix}`);
    }
    publishConnectivityCheckResult(result);
  };

  try {
    for (const account of accounts) {
      const serverUrl = account.caldav!.serverUrl;
      const attempt = await tryUrl('caldav', account.name, serverUrl, signal, requestTimeoutMs);
      attempts.push(attempt);

      if (attempt.ok) {
        pendingLogs.push(`Reachable: ${serverUrl}`);
        const result: ConnectivityCheckResult = {
          checkedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAt,
          online: true,
          source: 'caldav',
          accountsChecked: accounts.length,
          externalCheckUsed: false,
          externalFallbackType: null,
          attempts,
          message: `Reached ${account.name}.`,
        };
        publishAndMaybeLog(result);
        return result;
      }

      pendingLogs.push(`Probe failed: ${serverUrl}`);
    }

    if (!externalCheckEnabled) {
      const result: ConnectivityCheckResult = {
        checkedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        online: false,
        source: 'none',
        accountsChecked: accounts.length,
        externalCheckUsed: false,
        externalFallbackType: null,
        attempts,
        message:
          accounts.length > 0
            ? 'All CalDAV probes failed. External fallback is disabled.'
            : 'No active CalDAV accounts. External fallback is disabled.',
      };
      publishAndMaybeLog(result);
      return result;
    }

    const customTiebreakerUrl = settingsStore.getState().connectivityCheckUrl.trim();
    const externalFallbackType: ExternalFallbackType = customTiebreakerUrl ? 'custom' : 'default';
    fallbackUrl = customTiebreakerUrl || DEFAULT_CONNECTIVITY_CHECK_URL;
    const externalFallbackLabel =
      externalFallbackType === 'default' ? 'Default external fallback' : 'Custom external fallback';
    const externalAttempt = await tryUrl(
      'external',
      externalFallbackLabel,
      fallbackUrl,
      signal,
      requestTimeoutMs,
    );
    attempts.push(externalAttempt);

    const result: ConnectivityCheckResult = {
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      online: externalAttempt.ok,
      source: externalAttempt.ok ? 'external' : 'none',
      accountsChecked: accounts.length,
      externalCheckUsed: true,
      externalFallbackType,
      attempts,
      message: externalAttempt.ok
        ? `${externalFallbackLabel} is reachable.`
        : `CalDAV probes and ${externalFallbackLabel.toLowerCase()} failed.`,
    };
    publishAndMaybeLog(result);
    return result;
  } finally {
    activeConnectivityCheckCount = Math.max(0, activeConnectivityCheckCount - 1);
    publishConnectivityCheckStatus();
  }
};
