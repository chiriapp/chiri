import { useQueryClient } from '@tanstack/react-query';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  BrowserAuthFlowStep,
  type BrowserAuthFlowStepHandle,
  type BrowserAuthFlowStepPhase,
} from '$components/modals/AccountModal/steps/BrowserAuthFlowStep';
import { useSettingsStore } from '$context/settingsContext';
import { useAddCalendar, useCreateAccount } from '$hooks/queries/useAccounts';
import { fetchTasksForCalendar } from '$lib/account/setup';
import {
  type StalwartTokens,
  startStalwartOAuth,
  usernameFromPrincipalUrl,
  validateStalwartServer,
} from '$lib/auth/stalwart';
import { CalDAVClient } from '$lib/caldav';
import { toCalDAVSetupError } from '$lib/caldav/setup';
import { loggers } from '$lib/logger';
import { queryKeys } from '$lib/queryClient';

const log = loggers.account;

export type StalwartOAuthLoginStep = 'input' | 'authenticating' | 'processing';

export interface StalwartOAuthStepHandle {
  connect: () => void;
  cancel: () => void;
  getPhase: () => BrowserAuthFlowStepPhase;
}

interface StalwartOAuthStepProps {
  serverUrl: string;
  onServerUrlChange: (url: string) => void;
  acceptInvalidCerts: boolean;
  onSuccess: () => void;
  onStepChange: (step: StalwartOAuthLoginStep) => void;
  onConnectStateChange?: (state: { disabled: boolean; loading: boolean }) => void;
}

export const StalwartOAuthStep = forwardRef<StalwartOAuthStepHandle, StalwartOAuthStepProps>(
  (
    {
      serverUrl,
      onServerUrlChange,
      acceptInvalidCerts,
      onSuccess,
      onStepChange,
      onConnectStateChange,
    },
    ref,
  ) => {
    const flowRef = useRef<BrowserAuthFlowStepHandle>(null);
    const queryClient = useQueryClient();
    const createAccountMutation = useCreateAccount();
    const addCalendarMutation = useAddCalendar();
    const { enforceVapid } = useSettingsStore();

    const finishSetup = async (url: string, tokens: StalwartTokens) => {
      const accountId = crypto.randomUUID();
      const { principalUrl, displayName } = await CalDAVClient.connectWithBearer(
        accountId,
        url,
        tokens.username,
        tokens.accessToken,
        'stalwart',
        undefined,
        undefined,
        acceptInvalidCerts,
      );

      const username =
        tokens.username || usernameFromPrincipalUrl(principalUrl) || 'Stalwart account';

      const calendars = await CalDAVClient.getForAccount(accountId).fetchCalendars(enforceVapid);

      log.info(`[StalwartOAuth] Found ${calendars?.length ?? 0} calendars`, {
        serverUrl: url,
        displayName,
      });

      const newAccount = await createAccountMutation.mutateAsync({
        id: accountId,
        name: displayName || username,
        caldav: {
          serverUrl: url,
          username,
          password: tokens.accessToken,
          serverType: 'stalwart',
          authType: 'oauth',
          refreshToken: tokens.refreshToken,
          tokenExpiry: tokens.tokenExpiry,
          oauthClientId: tokens.clientId,
          acceptInvalidCerts,
        },
      });

      for (const calendar of calendars ?? []) {
        await addCalendarMutation.mutateAsync({
          accountId: newAccount.id,
          calendarData: calendar,
        });
      }

      for (const calendar of calendars ?? []) {
        await fetchTasksForCalendar(newAccount.id, calendar);
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    };

    const validateServerUrl = async (rawUrl: string, signal: AbortSignal) => {
      const result = await validateStalwartServer(rawUrl, signal, acceptInvalidCerts);
      if (signal.aborted) {
        return;
      }

      if (!result.ok) {
        if (result.reason === 'timeout') {
          throw toCalDAVSetupError(
            'Could not connect to Stalwart',
            'The connection to Stalwart timed out.',
          );
        }

        throw toCalDAVSetupError(
          'Could not connect to Stalwart',
          'Chiri could not reach the Stalwart server.',
        );
      }
    };

    const startFlow = async ({
      serverUrl: url,
      signal,
      setPhase,
    }: {
      serverUrl: string;
      signal: AbortSignal;
      setPhase: (phase: 'browser' | 'connecting') => void;
    }) => {
      const flow = startStalwartOAuth(url, { acceptInvalidCerts });

      const onAbort = () => {
        flow.cancel();
      };
      signal.addEventListener('abort', onAbort);

      try {
        setPhase('browser');
        const tokens = await flow.promise;

        if (signal.aborted) {
          throw new DOMException('Stalwart OAuth flow was cancelled', 'AbortError');
        }

        try {
          await getCurrentWindow().setFocus();
        } catch (err) {
          log.warn('[StalwartOAuth] Failed to focus window after authentication', { error: err });
        }

        setPhase('connecting');
        await finishSetup(url, tokens);
      } catch (e) {
        if (
          signal.aborted ||
          (e instanceof Error && e.message.toLowerCase().includes('cancelled'))
        ) {
          throw new DOMException('Stalwart OAuth flow was cancelled', 'AbortError');
        }
        throw e;
      } finally {
        signal.removeEventListener('abort', onAbort);
      }
    };

    useImperativeHandle(ref, () => ({
      connect: () => flowRef.current?.connect(),
      cancel: () => flowRef.current?.cancel(),
      getPhase: () => flowRef.current?.getPhase() ?? 'idle',
    }));

    return (
      <BrowserAuthFlowStep
        ref={flowRef}
        providerName="Stalwart"
        serverType="stalwart"
        requiresServerUrl
        urlLabel="Stalwart Server URL"
        urlPlaceholder="https://mail.example.com"
        urlValue={serverUrl}
        onUrlChange={onServerUrlChange}
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
  },
);
