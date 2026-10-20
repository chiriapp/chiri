import { useQueryClient } from '@tanstack/react-query';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  BrowserAuthFlowStep,
  type BrowserAuthFlowStepHandle,
} from '$components/modals/AccountModal/steps/BrowserAuthFlowStep';
import { useSettingsStore } from '$context/settingsContext';
import { useAddCalendar, useCreateAccount } from '$hooks/queries/useAccounts';
import { fetchTasksForCalendar } from '$lib/account/setup';
import {
  cancelNextcloudLogin,
  initiateNextcloudLogin,
  normalizeNextcloudUrl,
  validateNextcloudServer,
} from '$lib/auth/nextcloud';
import { normalizeRusticalUrl, validateRusticalServer } from '$lib/auth/rustical';
import { CalDAVClient } from '$lib/caldav';
import { toCalDAVSetupError } from '$lib/caldav/setup';
import { loggers } from '$lib/logger';
import { queryKeys } from '$lib/queryClient';
import { generateUUID } from '$utils/misc';

const log = loggers.account;

export type QuickConnectLoginStep = 'input' | 'authenticating' | 'processing';

export interface QuickConnectFlowStepHandle {
  connect: () => void;
  cancel: () => void;
}

interface QuickConnectFlowStepProps {
  serverType: 'nextcloud' | 'rustical';
  onSuccess: () => void;
  onStepChange: (step: QuickConnectLoginStep) => void;
  onConnectStateChange: (state: { disabled: boolean; loading: boolean }) => void;
}

const CONFIG = {
  nextcloud: {
    label: 'Nextcloud',
    urlLabel: 'Nextcloud Server URL',
    urlPlaceholder: 'https://cloud.example.com',
    normalize: normalizeNextcloudUrl,
    validate: validateNextcloudServer,
  },
  rustical: {
    label: 'RustiCal',
    urlLabel: 'RustiCal Server URL',
    urlPlaceholder: 'https://rust.example.com',
    normalize: normalizeRusticalUrl,
    validate: validateRusticalServer,
  },
};

export const QuickConnectFlowStep = forwardRef<
  QuickConnectFlowStepHandle,
  QuickConnectFlowStepProps
>(({ serverType, onSuccess, onStepChange, onConnectStateChange }, ref) => {
  const [serverUrl, setServerUrl] = useState('');
  const flowRef = useRef<BrowserAuthFlowStepHandle>(null);
  const queryClient = useQueryClient();
  const createAccountMutation = useCreateAccount();
  const addCalendarMutation = useAddCalendar();
  const { enforceVapid } = useSettingsStore();
  const config = CONFIG[serverType];

  useEffect(() => {
    return () => {
      cancelNextcloudLogin();
    };
  }, []);

  const validateServerUrl = async (rawUrl: string, signal: AbortSignal) => {
    const normalizedUrl = config.normalize(rawUrl);
    log.info(`Validating ${config.label} server`, { url: normalizedUrl });

    const result = await config.validate(normalizedUrl, signal);
    if (signal.aborted) {
      return;
    }

    if (!result.ok) {
      if (result.reason === 'timeout') {
        throw toCalDAVSetupError(
          `Could not connect to ${config.label}`,
          `The connection to ${config.label} timed out.`,
        );
      }

      throw toCalDAVSetupError(
        `Could not connect to ${config.label}`,
        `Chiri could not reach the ${config.label} server.`,
      );
    }
  };

  const startFlow = async ({
    serverUrl: rawUrl,
    signal,
    setPhase,
  }: {
    serverUrl: string;
    signal: AbortSignal;
    setPhase: (phase: 'browser' | 'connecting') => void;
  }) => {
    const normalizedUrl = config.normalize(rawUrl);
    const loginUrl =
      serverType === 'rustical' ? normalizeNextcloudUrl(normalizedUrl) : normalizedUrl;

    const onAbort = () => {
      cancelNextcloudLogin();
    };
    signal.addEventListener('abort', onAbort);

    try {
      if (signal.aborted) {
        throw new DOMException('Login flow cancelled', 'AbortError');
      }

      log.info('Server validated, starting login flow');
      setPhase('browser');
      const credentials = await initiateNextcloudLogin(loginUrl);

      if (signal.aborted) {
        throw new DOMException('Login flow cancelled', 'AbortError');
      }

      log.info('Login credentials received, setting up account');

      try {
        await getCurrentWindow().setFocus();
      } catch (err) {
        log.warn('Failed to focus window after authentication', { error: err });
      }

      setPhase('connecting');

      const accountId = generateUUID();
      await CalDAVClient.connect(
        accountId,
        credentials.server,
        credentials.loginName,
        credentials.appPassword,
        serverType,
      );

      const calendars = await CalDAVClient.getForAccount(accountId).fetchCalendars(enforceVapid);
      log.info(`Found ${calendars?.length ?? 0} calendars`);

      await createAccountMutation.mutateAsync({
        id: accountId,
        name: `${config.label} (${credentials.loginName})`,
        caldav: {
          serverUrl: credentials.server,
          username: credentials.loginName,
          password: credentials.appPassword,
          serverType,
          authType: 'basic',
        },
      });

      if (calendars && calendars.length > 0) {
        for (const calendar of calendars) {
          await addCalendarMutation.mutateAsync({ accountId, calendarData: calendar });
        }
      }

      for (const calendar of calendars) {
        await fetchTasksForCalendar(accountId, calendar);
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    } catch (e) {
      if (signal.aborted || (e instanceof Error && e.message.toLowerCase().includes('cancelled'))) {
        throw new DOMException('Login flow cancelled', 'AbortError');
      }
      throw e;
    } finally {
      signal.removeEventListener('abort', onAbort);
    }
  };

  useImperativeHandle(ref, () => ({
    connect: () => flowRef.current?.connect(),
    cancel: () => flowRef.current?.cancel(),
  }));

  return (
    <BrowserAuthFlowStep
      ref={flowRef}
      providerName={config.label}
      serverType={serverType}
      requiresServerUrl
      urlLabel={config.urlLabel}
      urlPlaceholder={config.urlPlaceholder}
      urlValue={serverUrl}
      onUrlChange={setServerUrl}
      validateServerUrl={validateServerUrl}
      startFlow={startFlow}
      onSuccess={onSuccess}
      onPhaseChange={(phase) => {
        onStepChange(
          phase === 'idle'
            ? 'input'
            : phase === 'connecting' || phase === 'done'
              ? 'processing'
              : 'authenticating',
        );
      }}
      onConnectStateChange={onConnectStateChange}
    />
  );
});
