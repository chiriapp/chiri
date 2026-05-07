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
} from '$lib/nextcloud-auth';
import { normalizeRusticalUrl, validateRusticalServer } from '$lib/rustical-auth';
import { generateUUID } from '$utils/misc';

const log = loggers.account;

interface RusticalLoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const RusticalLoginModal = ({ onClose, onSuccess }: RusticalLoginModalProps) => {
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
      setError('Please enter your RustiCal server URL');
      return;
    }

    setError('');
    setIsValidating(true);

    try {
      const normalizedUrl = normalizeRusticalUrl(serverUrl);
      log.info('Validating RustiCal server', { url: normalizedUrl });

      // Validate server using /ping endpoint
      const isValid = await validateRusticalServer(normalizedUrl);
      if (!isValid) {
        setError(
          'Could not connect to RustiCal server. Please check the URL and ensure the server is running.',
        );
        setIsValidating(false);
        return;
      }

      log.info('Server validated, starting login flow');
      setIsValidating(false);
      setIsLoggingIn(true);
      setStep('authenticating');

      // Initiate login flow (opens browser and polls)
      // Use normalizeNextcloudUrl for compatibility with the Login Flow API
      const credentials = await initiateNextcloudLogin(normalizeNextcloudUrl(normalizedUrl));

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

      // Create account
      const accountId = generateUUID();

      // Connect to server to verify credentials and fetch calendars
      await CalDAVClient.connect(
        accountId,
        credentials.server,
        credentials.loginName,
        credentials.appPassword,
        'rustical',
      );

      // Fetch calendars from the server
      const calendars = await CalDAVClient.getForAccount(accountId).fetchCalendars();

      log.info(`Found ${calendars?.length || 0} calendars on RustiCal server`);

      // Create the account with app password
      await createAccountMutation.mutateAsync({
        id: accountId,
        name: `RustiCal (${credentials.loginName})`,
        serverUrl: credentials.server,
        username: credentials.loginName,
        password: credentials.appPassword,
        serverType: 'rustical',
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
        log.warn('No calendars found on RustiCal server - user can create them later');
      }

      // Trigger initial sync
      log.info('Starting sync for new account');
      await syncAll({
        source: 'account-setup-rustical',
        reason: 'completed RustiCal account creation flow',
        where: 'RusticalLoginModal.handleValidateAndLogin',
      });

      log.info('RustiCal account setup complete');
      onSuccess();
    } catch (err) {
      log.error('RustiCal login failed', { error: err });
      if (err instanceof Error) {
        if (err.message.includes('cancelled')) {
          setError('Login was cancelled');
        } else {
          setError(err.message || 'Login failed. Please try again.');
        }
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsProcessing(false);
      setIsValidating(false);
      setIsLoggingIn(false);
      setStep('input');
    }
  };

  const isLoading = isValidating || isLoggingIn || isProcessing;

  return (
    <ModalWrapper
      onClose={onClose}
      title="Connect to RustiCal"
      description="Authenticate via browser"
      zIndex="z-70"
      preventClose={isProcessing}
    >
      {step === 'input' && (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="rustical-server-url"
              className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
            >
              RustiCal Server URL
            </label>
            <ComposedInput
              ref={(el) => {
                if (el) setTimeout(() => el.focus(), 100);
              }}
              id="rustical-server-url"
              type="url"
              value={serverUrl}
              onChange={setServerUrl}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading && serverUrl.trim()) {
                  handleValidateAndLogin();
                }
              }}
              placeholder="https://rust.example.com"
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
            />
            <p className="mt-1.5 text-xs text-surface-500 dark:text-surface-400">
              Your browser will open for authentication
            </p>
          </div>

          {error && (
            <div className="p-3 text-sm text-semantic-error bg-semantic-error/10 border border-semantic-error/30 rounded-lg">
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
          <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-purple-600 dark:text-purple-400" />
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
          <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-purple-600 dark:text-purple-400" />
          <h3 className="mb-1 text-base font-medium text-surface-800 dark:text-surface-200">
            Setting up your account...
          </h3>
          <p className="text-sm text-surface-500 dark:text-surface-400">Importing calendars</p>
        </div>
      )}
    </ModalWrapper>
  );
};
