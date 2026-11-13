import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { openUrl } from '@tauri-apps/plugin-opener';
import { normalizeHttpServerUrl } from '$lib/caldav/utils';
import { loggers } from '$lib/logger';
import type { ServerValidationResult } from '$types/account';

const log = loggers.http;

// track active polling to allow cancellation
let activePollingController: AbortController | null = null;

interface LoginFlowInit {
  poll: {
    token: string;
    endpoint: string;
  };
  login: string;
}

interface LoginCredentials {
  server: string;
  loginName: string;
  appPassword: string;
}

/**
 * initiates Nextcloud Login Flow v2
 * @param serverUrl the Nextcloud server URL
 * @returns promise that resolves with login credentials
 */
export const initiateNextcloudLogin = async (serverUrl: string) => {
  const normalizedUrl = normalizeHttpServerUrl(serverUrl);

  log.info('Initiating Nextcloud Login Flow v2', { serverUrl: normalizedUrl });

  // cancel any existing polling operation
  if (activePollingController) {
    log.info('Cancelling previous polling operation');
    activePollingController.abort();
    activePollingController = null;
  }

  try {
    const initResponse = await tauriFetch(`${normalizedUrl}/index.php/login/v2`, {
      method: 'POST',
      headers: {
        'OCS-APIRequest': 'true',
        'User-Agent': 'Chiri',
      },
    });

    if (!initResponse.ok) {
      throw new Error(`Failed to initiate login flow: ${initResponse.status}`);
    }

    const flowData: LoginFlowInit = await initResponse.json();

    log.debug('Login flow initiated', { loginUrl: flowData.login });

    await openUrl(flowData.login);
    log.info('Opened browser for authentication');

    const controller = new AbortController();
    activePollingController = controller;

    const credentials = await pollForCredentials(flowData.poll, controller.signal);

    if (activePollingController === controller) {
      activePollingController = null;
    }

    log.info('Login successful', { loginName: credentials.loginName });

    return credentials;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    if (activePollingController) {
      activePollingController = null;
    }

    if (
      error instanceof Error &&
      (error.message === 'Login flow cancelled' || error.name === 'AbortError')
    ) {
      log.info('Nextcloud login flow cancelled by user');
      throw error;
    }

    log.error('Login flow failed', {
      message: errorMessage,
      stack: errorStack,
      error: error instanceof Error ? { name: error.name, message: error.message } : error,
    });
    throw error;
  }
};

/**
 * polls the Nextcloud server for login credentials
 * continues polling until credentials are received or timeout occurs
 */
const pollForCredentials = async (
  poll: {
    token: string;
    endpoint: string;
  },
  signal: AbortSignal,
) => {
  const maxAttempts = 600;
  const pollInterval = 2000;
  let attempts = 0;

  log.debug('Starting to poll for credentials', {
    endpoint: poll.endpoint,
    maxAttempts,
  });

  while (attempts < maxAttempts) {
    if (signal.aborted) {
      log.info('Polling cancelled');
      throw new Error('Login flow cancelled');
    }

    try {
      log.debug('Polling attempt', { attempt: attempts + 1, maxAttempts });

      const response = await tauriFetch(poll.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Chiri',
        },
        body: `token=${encodeURIComponent(poll.token)}`,
      });

      log.debug('Poll response received', { status: response.status });

      if (response.status === 200) {
        const credentials: LoginCredentials = await response.json();
        log.info('Credentials received');
        return credentials;
      }

      if (response.status === 404) {
        attempts++;
        log.debug('Still waiting for authentication', {
          attempt: attempts,
          maxAttempts,
        });

        if (signal.aborted) {
          log.info('Polling cancelled during wait');
          throw new Error('Login flow cancelled');
        }

        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        continue;
      }

      const errorText = await response.text();
      throw new Error(`Unexpected polling status: ${response.status}. Response: ${errorText}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'Login flow cancelled') {
        throw error;
      }

      // network errors or other issues
      if (error instanceof Error && error.message.includes('Unexpected polling status')) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.warn('Polling error, retrying', {
        message: errorMessage,
        attempt: attempts,
      });
      log.warn('Polling error, retrying', { error, attempt: attempts });
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error(
    'Login flow timed out. Please try again and complete the authentication within 20 minutes.',
  );
};

/**
 * cancels any active Nextcloud login polling operation
 * useful when closing the login modal or starting a new login
 */
export const cancelNextcloudLogin = () => {
  if (activePollingController) {
    log.info('Cancelling active Nextcloud login flow');
    activePollingController.abort();
    activePollingController = null;
  }
};

/**
 * validates that the provided URL is a valid Nextcloud server
 * by attempting to fetch the status endpoint
 */
export const validateNextcloudServer = async (
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
    const response = await tauriFetch(`${normalizedUrl}/status.php`, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, reason: 'unreachable' };
    }

    const status = await response.json();

    // check if it's a Nextcloud server
    return status && typeof status.installed === 'boolean' && typeof status.version === 'string'
      ? { ok: true }
      : { ok: false, reason: 'unreachable' };
  } catch (error) {
    if (signal?.aborted) {
      return { ok: false, reason: 'unreachable' };
    }

    if (timedOut || (error instanceof Error && error.name === 'AbortError')) {
      return { ok: false, reason: 'timeout' };
    }

    log.debug('Server validation failed', { error });
    return { ok: false, reason: 'unreachable' };
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onParentAbort);
  }
};

/**
 * deletes an app password on logout (optional cleanup)
 * @param serverUrl the Nextcloud server URL
 * @param username the username
 * @param appPassword the app password to delete
 */
export const deleteAppPassword = async (
  serverUrl: string,
  username: string,
  appPassword: string,
) => {
  const normalizedUrl = normalizeHttpServerUrl(serverUrl);

  try {
    await tauriFetch(`${normalizedUrl}/ocs/v2.php/core/apppassword`, {
      method: 'DELETE',
      headers: {
        'OCS-APIRequest': 'true',
        'User-Agent': 'Chiri',
        Authorization: `Basic ${btoa(`${username}:${appPassword}`)}`,
      },
    });

    log.info('App password deleted');
  } catch (error) {
    // don't throw - deletion is best-effort
    log.warn('Failed to delete app password', { error });
  }
};
