import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { openUrl } from '@tauri-apps/plugin-opener';
import { hasHttpUrlScheme } from '$lib/caldav/utils';
import { loggers } from '$lib/logger';

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
 * normalizes a Nextcloud server URL
 * requires an explicit http/https scheme and removes trailing slashes
 */
export const normalizeNextcloudUrl = (url: string) => {
  const normalized = url.trim();
  if (!hasHttpUrlScheme(normalized)) {
    throw new Error('Server URL must start with http:// or https://.');
  }

  return normalized.replace(/\/$/, '');
};

/**
 * initiates Nextcloud Login Flow v2
 * @param serverUrl The Nextcloud server URL
 * @returns Promise that resolves with login credentials
 */
export const initiateNextcloudLogin = async (serverUrl: string) => {
  const normalizedUrl = normalizeNextcloudUrl(serverUrl);

  log.info('Initiating Nextcloud Login Flow v2', { serverUrl: normalizedUrl });

  // cancel any existing polling operation
  if (activePollingController) {
    log.info('Cancelling previous polling operation');
    activePollingController.abort();
    activePollingController = null;
  }

  try {
    // step 1: Initiate login flow
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

    // step 2: Open browser for user authentication
    await openUrl(flowData.login);

    log.info('Opened browser for authentication');

    // step 3: Create new abort controller for this polling operation
    const controller = new AbortController();
    activePollingController = controller;

    // poll for credentials
    const credentials = await pollForCredentials(flowData.poll, controller.signal);

    // clear the controller on success
    if (activePollingController === controller) {
      activePollingController = null;
    }

    log.info('Login successful', { loginName: credentials.loginName });

    return credentials;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // clear the controller on error
    if (activePollingController) {
      activePollingController = null;
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
  const maxAttempts = 600; // 20 minutes (2s intervals)
  const pollInterval = 2000; // 2 seconds
  let attempts = 0;

  log.debug('Starting to poll for credentials', {
    endpoint: poll.endpoint,
    maxAttempts,
  });

  while (attempts < maxAttempts) {
    // check if polling was cancelled
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

      // status 200 means authentication successful
      if (response.status === 200) {
        const credentials: LoginCredentials = await response.json();
        log.info('Credentials received');
        return credentials;
      }

      // status 404 means still waiting for user to authenticate
      if (response.status === 404) {
        attempts++;
        log.debug('Still waiting for authentication', {
          attempt: attempts,
          maxAttempts,
        });

        // check for cancellation before waiting
        if (signal.aborted) {
          log.info('Polling cancelled during wait');
          throw new Error('Login flow cancelled');
        }

        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        continue;
      }

      // any other status is an error
      const errorText = await response.text();
      throw new Error(`Unexpected polling status: ${response.status}. Response: ${errorText}`);
    } catch (error) {
      // if polling was cancelled, don't retry
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
export const validateNextcloudServer = async (serverUrl: string): Promise<boolean> => {
  const normalizedUrl = normalizeNextcloudUrl(serverUrl);

  try {
    const response = await tauriFetch(`${normalizedUrl}/status.php`, {
      method: 'GET',
    });

    if (!response.ok) {
      return false;
    }

    const status = await response.json();

    // check if it's a Nextcloud server
    return status && typeof status.installed === 'boolean' && typeof status.version === 'string';
  } catch (error) {
    log.debug('Server validation failed', { error });
    return false;
  }
};

/**
 * deletes an app password on logout (optional cleanup)
 * @param serverUrl The Nextcloud server URL
 * @param username The username
 * @param appPassword The app password to delete
 */
export const deleteAppPassword = async (
  serverUrl: string,
  username: string,
  appPassword: string,
) => {
  const normalizedUrl = normalizeNextcloudUrl(serverUrl);

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
