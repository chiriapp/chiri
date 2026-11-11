import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { normalizeHttpServerUrl } from '$lib/caldav/utils';
import { loggers } from '$lib/logger';
import type { ServerValidationResult } from '$types/account';

const log = loggers.http;

/**
 * validates a RustiCal server by checking the /ping endpoint
 * @param serverUrl the RustiCal server URL
 * @returns promise that resolves to true if it's a valid RustiCal server
 */
export const validateRusticalServer = async (
  serverUrl: string,
  signal?: AbortSignal,
  timeoutMs = 15_000,
): Promise<ServerValidationResult> => {
  const normalizedUrl = normalizeHttpServerUrl(serverUrl);
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onParentAbort = () => controller.abort();
  signal?.addEventListener('abort', onParentAbort);

  try {
    log.debug('Validating RustiCal server', { url: normalizedUrl });

    const response = await tauriFetch(`${normalizedUrl}/ping`, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      log.debug('Ping endpoint returned non-200 status', { status: response.status });
      return { ok: false, reason: 'unreachable' };
    }

    const text = await response.text();

    // check if it responds with "Pong!"
    const isRustical = text.trim() === 'Pong!';

    if (isRustical) {
      log.info('RustiCal server validated successfully', { url: normalizedUrl });
    } else {
      log.debug('Server responded but not with expected Pong message', { response: text });
    }

    return isRustical ? { ok: true } : { ok: false, reason: 'unreachable' };
  } catch (error) {
    if (signal?.aborted) {
      return { ok: false, reason: 'unreachable' };
    }

    if (timedOut || (error instanceof Error && error.name === 'AbortError')) {
      return { ok: false, reason: 'timeout' };
    }

    log.debug('RustiCal server validation failed', { error, url: normalizedUrl });
    return { ok: false, reason: 'unreachable' };
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onParentAbort);
  }
};
