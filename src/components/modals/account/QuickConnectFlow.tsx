import { getCurrentWindow } from '@tauri-apps/api/window';
import Loader2 from 'lucide-react/icons/loader-2';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { ComposedInput } from '$components/ComposedInput';
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
import { normalizeRusticalUrl, validateRusticalServer } from '$lib/rustical-auth';
import { generateUUID } from '$utils/misc';

const log = loggers.account;

export type QuickConnectLoginStep = 'input' | 'authenticating' | 'processing';

export interface QuickConnectFlowHandle {
  connect: () => void;
}

interface QuickConnectFlowProps {
  serverType: 'nextcloud' | 'rustical';
  onSuccess: () => void;
  onStepChange: (step: QuickConnectLoginStep) => void;
  onConnectStateChange: (state: { disabled: boolean; loading: boolean }) => void;
}

const CONFIG = {
  nextcloud: {
    label: 'Nextcloud',
    urlLabel: 'Nextcloud Server URL',
    urlPlaceholder: 'cloud.example.com or https://cloud.example.com',
    spinnerColor: 'text-primary-500',
    normalize: normalizeNextcloudUrl,
    validate: validateNextcloudServer,
    syncSource: 'account-setup-nextcloud' as const,
    syncReason: 'completed Nextcloud account creation flow',
    syncWhere: 'QuickConnectFlow.nextcloud',
  },
  rustical: {
    label: 'RustiCal',
    urlLabel: 'RustiCal Server URL',
    urlPlaceholder: 'https://rust.example.com',
    spinnerColor: 'text-primary-500',
    normalize: normalizeRusticalUrl,
    validate: validateRusticalServer,
    syncSource: 'account-setup-rustical' as const,
    syncReason: 'completed RustiCal account creation flow',
    syncWhere: 'QuickConnectFlow.rustical',
  },
};

export const QuickConnectFlow = forwardRef<QuickConnectFlowHandle, QuickConnectFlowProps>(
  ({ serverType, onSuccess, onStepChange, onConnectStateChange }, ref) => {
    const [serverUrl, setServerUrl] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [loginStep, setLoginStep] = useState<QuickConnectLoginStep>('input');

    const createAccountMutation = useCreateAccount();
    const addCalendarMutation = useAddCalendar();
    const { syncAll } = useSyncQuery();

    const config = CONFIG[serverType];
    const isLoading = isValidating || isLoggingIn || isProcessing;

    const updateStep = (s: QuickConnectLoginStep) => {
      setLoginStep(s);
      onStepChange(s);
    };

    useEffect(() => {
      onConnectStateChange({ disabled: isLoading || !serverUrl.trim(), loading: isLoading });
    }, [isLoading, onConnectStateChange, serverUrl]);

    useEffect(() => {
      return () => {
        cancelNextcloudLogin();
      };
    }, []);

    const showLoginError = (err: unknown) => {
      if (!(err instanceof Error)) {
        setError('An unexpected error occurred. Please try again.');
        return;
      }

      if (err.message.includes('timed out')) {
        setError(
          'Login timed out. Please try again and complete the authentication within 20 minutes.',
        );
        return;
      }

      if (err.message.includes('cancelled')) {
        setError('Login was cancelled.');
        return;
      }

      setError(err.message || 'Login failed. Please try again.');
    };

    const handleConnect = async () => {
      if (!serverUrl.trim()) {
        setError(`Please enter your ${config.label} server URL`);
        return;
      }

      setError('');
      setIsValidating(true);

      try {
        const normalizedUrl = config.normalize(serverUrl);
        log.info(`Validating ${config.label} server`, { url: normalizedUrl });

        const isValid = await config.validate(normalizedUrl);
        if (!isValid) {
          setError(
            `Could not connect to ${config.label} server. Please check the URL and try again.`,
          );
          setIsValidating(false);
          return;
        }

        log.info('Server validated, starting login flow');
        setIsValidating(false);
        setIsLoggingIn(true);
        updateStep('authenticating');

        const loginUrl =
          serverType === 'rustical' ? normalizeNextcloudUrl(normalizedUrl) : normalizedUrl;
        const credentials = await initiateNextcloudLogin(loginUrl);

        log.info('Login credentials received, setting up account');

        try {
          await getCurrentWindow().setFocus();
        } catch (err) {
          log.warn('Failed to focus window after authentication', { error: err });
        }

        setIsLoggingIn(false);
        setIsProcessing(true);
        updateStep('processing');

        const accountId = generateUUID();
        await CalDAVClient.connect(
          accountId,
          credentials.server,
          credentials.loginName,
          credentials.appPassword,
          serverType,
        );

        const calendars = await CalDAVClient.getForAccount(accountId).fetchCalendars();
        log.info(`Found ${calendars?.length ?? 0} calendars`);

        await createAccountMutation.mutateAsync({
          id: accountId,
          name: `${config.label} (${credentials.loginName})`,
          serverUrl: credentials.server,
          username: credentials.loginName,
          password: credentials.appPassword,
          serverType,
        });

        if (calendars && calendars.length > 0) {
          for (const calendar of calendars) {
            await addCalendarMutation.mutateAsync({ accountId, calendarData: calendar });
          }
        }

        await syncAll({
          source: config.syncSource,
          reason: config.syncReason,
          where: config.syncWhere,
        });

        onSuccess();
      } catch (err) {
        log.error(`${config.label} login failed`, { error: err });
        setIsValidating(false);
        setIsLoggingIn(false);
        setIsProcessing(false);
        updateStep('input');
        showLoginError(err);
      }
    };

    useImperativeHandle(ref, () => ({ connect: handleConnect }));

    if (loginStep === 'authenticating') {
      return (
        <div className="py-8 text-center">
          <Loader2 className={`mx-auto mb-3 h-10 w-10 animate-spin ${config.spinnerColor}`} />
          <h3 className="mb-1 text-base font-medium text-surface-800 dark:text-surface-200">
            Waiting for authentication...
          </h3>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Complete the login in your browser
          </p>
        </div>
      );
    }

    if (loginStep === 'processing') {
      return (
        <div className="py-8 text-center">
          <Loader2 className={`mx-auto mb-3 h-10 w-10 animate-spin ${config.spinnerColor}`} />
          <h3 className="mb-1 text-base font-medium text-surface-800 dark:text-surface-200">
            Setting up your account...
          </h3>
          <p className="text-sm text-surface-500 dark:text-surface-400">Importing calendars</p>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-4">
        <div>
          <label
            htmlFor="quick-connect-url"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
          >
            {config.urlLabel}
          </label>
          <ComposedInput
            id="quick-connect-url"
            ref={(el) => {
              if (el) setTimeout(() => el.focus(), 100);
            }}
            type="text"
            placeholder={config.urlPlaceholder}
            value={serverUrl}
            onChange={setServerUrl}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading && serverUrl.trim()) handleConnect();
            }}
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
      </div>
    );
  },
);
QuickConnectFlow.displayName = 'QuickConnectFlow';
