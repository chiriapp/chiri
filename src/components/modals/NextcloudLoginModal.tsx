import { getCurrentWindow } from '@tauri-apps/api/window';
import Loader2 from 'lucide-react/icons/loader-2';
import { useEffect, useState } from 'react';
import { ComposedInput } from '$components/ComposedInput';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { useAddCalendar, useCreateAccount } from '$hooks/queries/useAccounts';
import { useSyncQuery } from '$hooks/queries/useSync';
import { CalDAVClient } from '$lib/caldav';
import { loggers } from '$lib/logger';
import {
  cancelNextcloudLogin,
  initiateNextcloudLogin,
  normalizeNextcloudUrl,
  validateNextcloudServer,
} from '$lib/nextcloud-auth';
import { generateUUID } from '$utils/misc';

const log = loggers.account;

interface NextcloudLoginModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const NextcloudLoginModal = ({ onClose, onSuccess }: NextcloudLoginModalProps) => {
  const [serverUrl, setServerUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'input' | 'authenticating' | 'processing'>('input');

  const createAccountMutation = useCreateAccount();
  const addCalendarMutation = useAddCalendar();
  const { syncAll } = useSyncQuery();

  // Cancel any active polling when modal unmounts
  useEffect(() => {
    return () => {
      cancelNextcloudLogin();
    };
  }, []);

  const handleValidateAndLogin = async () => {
    if (!serverUrl.trim()) {
      setError('Please enter a Nextcloud server URL');
      return;
    }

    setError('');
    setIsValidating(true);

    try {
      const normalizedUrl = normalizeNextcloudUrl(serverUrl);

      // Validate server
      log.info('Validating Nextcloud server', { url: normalizedUrl });
      const isValid = await validateNextcloudServer(normalizedUrl);

      if (!isValid) {
        setError('Unable to connect to Nextcloud server. Please check the URL and try again.');
        setIsValidating(false);
        return;
      }

      log.info('Server validated, starting login flow');
      setIsValidating(false);
      setIsLoggingIn(true);
      setStep('authenticating');

      // Initiate login flow
      const credentials = await initiateNextcloudLogin(normalizedUrl);

      log.info('Login credentials received, setting up account');

      // Focus the app window after authentication completes
      try {
        await getCurrentWindow().setFocus();
      } catch (error) {
        log.warn('Failed to focus window after authentication', { error });
      }

      setIsLoggingIn(false);
      setIsProcessing(true);
      setStep('processing');

      // Test connection and get calendars
      const accountId = generateUUID();
      await CalDAVClient.connect(
        accountId,
        credentials.server,
        credentials.loginName,
        credentials.appPassword,
        'nextcloud',
      );

      // Fetch calendars from the server
      const calendars = await CalDAVClient.getForAccount(accountId).fetchCalendars();

      log.info(`Found ${calendars?.length || 0} calendars on Nextcloud server`);

      // Create the account
      await createAccountMutation.mutateAsync({
        id: accountId,
        name: `Nextcloud (${credentials.loginName})`,
        serverUrl: credentials.server,
        username: credentials.loginName,
        password: credentials.appPassword,
        serverType: 'nextcloud',
      });

      // Add all discovered calendars to the account
      if (calendars && calendars.length > 0) {
        for (const calendar of calendars) {
          await addCalendarMutation.mutateAsync({
            accountId,
            calendarData: calendar,
          });
        }
        log.info(`Added ${calendars.length} calendars to account`);
      } else {
        log.warn('No calendars found on Nextcloud server - user can create them later');
      }

      log.info('Account created successfully');

      // Trigger sync to fetch tasks from the new account
      log.info('Starting sync for new account');
      await syncAll({
        source: 'account-setup-nextcloud',
        reason: 'completed Nextcloud account creation flow',
        where: 'NextcloudLoginModal.handleValidateAndLogin',
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        log.error('Nextcloud login failed', {
          message: err.message,
          stack: err.stack,
        });
      } else {
        log.error('Nextcloud login failed', { error: String(err) });
      }

      setIsValidating(false);
      setIsLoggingIn(false);
      setIsProcessing(false);
      setStep('input');

      if (err instanceof Error) {
        if (err.message.includes('timed out')) {
          setError(
            'Login timed out. Please try again and complete the authentication within 20 minutes.',
          );
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(err.message || 'Login failed. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  const isLoading = isValidating || isLoggingIn || isProcessing;

  return (
    <ModalWrapper
      onClose={onClose}
      title="Connect to Nextcloud"
      zIndex="z-60"
      preventClose={isProcessing}
    >
      {step === 'input' && (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="nextcloud-url"
              className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
            >
              Nextcloud Server URL
            </label>
            <ComposedInput
              id="nextcloud-url"
              ref={(el) => {
                if (el) setTimeout(() => el.focus(), 100);
              }}
              type="text"
              placeholder="cloud.example.com or https://cloud.example.com"
              value={serverUrl}
              onChange={setServerUrl}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading && serverUrl.trim()) {
                  handleValidateAndLogin();
                }
              }}
              className="w-full px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
            />
            <p className="mt-1.5 text-xs text-surface-500 dark:text-surface-400">
              Your browser will open for authentication
            </p>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <ModalButton variant="secondary" onClick={onClose}>
              Cancel
            </ModalButton>
            <ModalButton
              onClick={handleValidateAndLogin}
              disabled={isLoading || !serverUrl.trim()}
              loading={isLoading}
            >
              Connect
            </ModalButton>
          </div>
        </div>
      )}

      {step === 'authenticating' && (
        <div className="py-8 text-center">
          <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-primary-500" />
          <h3 className="mb-1 text-base font-medium text-surface-800 dark:text-surface-200">
            Waiting for authentication...
          </h3>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Complete the login in your browser
          </p>
        </div>
      )}

      {step === 'processing' && (
        <div className="py-8 text-center">
          <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-primary-500" />
          <h3 className="mb-1 text-base font-medium text-surface-800 dark:text-surface-200">
            Setting up your account...
          </h3>
          <p className="text-sm text-surface-500 dark:text-surface-400">Importing calendars</p>
        </div>
      )}
    </ModalWrapper>
  );
};
