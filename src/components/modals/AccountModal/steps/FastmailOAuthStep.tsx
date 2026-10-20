import { useQueryClient } from '@tanstack/react-query';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import {
  BrowserAuthFlowStep,
  type BrowserAuthFlowStepHandle,
  type BrowserAuthFlowStepPhase,
} from '$components/modals/AccountModal/steps/BrowserAuthFlowStep';
import { useSettingsStore } from '$context/settingsContext';
import { useAddCalendar, useCreateAccount } from '$hooks/queries/useAccounts';
import { useSyncQuery } from '$hooks/queries/useSync';
import { fetchTasksForCalendar } from '$lib/account/setup';
import {
  FASTMAIL_CALDAV_URL,
  startFastmailOAuth,
  usernameFromPrincipalUrl,
} from '$lib/auth/fastmail';
import { CalDAVClient } from '$lib/caldav';
import { queryKeys } from '$lib/queryClient';
import { replaceOAuthAccountAuthorization } from '$lib/store/accounts';
import type { Account } from '$types/account';

export interface FastmailOAuthStepHandle {
  connect: () => void;
  cancel: () => void;
  getPhase: () => BrowserAuthFlowStepPhase;
}

interface FastmailOAuthStepProps {
  account?: Account | null;
  onSuccess: () => void;
  onSetupInProgressChange: (inProgress: boolean) => void;
  onConnectStateChange?: (state: { disabled: boolean; loading: boolean }) => void;
}

export const FastmailOAuthStep = forwardRef<FastmailOAuthStepHandle, FastmailOAuthStepProps>(
  ({ account, onSuccess, onSetupInProgressChange, onConnectStateChange }, ref) => {
    const flowRef = useRef<BrowserAuthFlowStepHandle>(null);
    const queryClient = useQueryClient();
    const createAccountMutation = useCreateAccount();
    const addCalendarMutation = useAddCalendar();
    const { syncAll } = useSyncQuery();
    const { enforceVapid } = useSettingsStore();

    useEffect(() => {
      return () => {
        flowRef.current?.cancel();
      };
    }, []);

    const startFlow = async ({
      signal,
      setPhase,
    }: {
      serverUrl: string;
      signal: AbortSignal;
      setPhase: (phase: 'browser' | 'connecting') => void;
    }) => {
      const flow = startFastmailOAuth();

      const onAbort = () => {
        flow.cancel();
      };
      signal.addEventListener('abort', onAbort);

      try {
        setPhase('browser');
        const tokens = await flow.promise;

        if (signal.aborted) {
          throw new DOMException('Fastmail OAuth flow was cancelled', 'AbortError');
        }

        setPhase('connecting');

        const { accessToken, refreshToken, tokenExpiry } = tokens;

        if (account) {
          const updatedAccount = await replaceOAuthAccountAuthorization(account.id, tokens);
          await CalDAVClient.reconnect(updatedAccount);
          syncAll({
            source: 'account-setup-fastmail',
            reason: 'completed Fastmail OAuth account reconnection',
            where: 'FastmailOAuthStep',
          });
          return;
        }

        const accountId = crypto.randomUUID();

        const { principalUrl, displayName } = await CalDAVClient.connectWithBearer(
          accountId,
          FASTMAIL_CALDAV_URL,
          '',
          accessToken,
          'fastmail',
        );

        const username = usernameFromPrincipalUrl(principalUrl);

        const calendars = await CalDAVClient.getForAccount(accountId).fetchCalendars(enforceVapid);

        const newAccount = await createAccountMutation.mutateAsync({
          id: accountId,
          name: `${displayName || username} (Fastmail)`,
          icon: 'user',
          caldav: {
            serverUrl: FASTMAIL_CALDAV_URL,
            username,
            password: accessToken,
            serverType: 'fastmail',
            authType: 'oauth',
            refreshToken,
            tokenExpiry,
          },
        });

        for (const calendar of calendars) {
          await addCalendarMutation.mutateAsync({
            accountId: newAccount.id,
            calendarData: calendar,
          });
        }

        for (const calendar of calendars) {
          await fetchTasksForCalendar(newAccount.id, calendar);
        }

        await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
        await queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
      } catch (e) {
        if (
          signal.aborted ||
          (e instanceof Error && e.message.toLowerCase().includes('cancelled'))
        ) {
          throw new DOMException('Fastmail OAuth flow was cancelled', 'AbortError');
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
        providerName="Fastmail"
        serverType="fastmail"
        startFlow={startFlow}
        onSuccess={onSuccess}
        onPhaseChange={(phase) => {
          onSetupInProgressChange(phase === 'connecting');
        }}
        onConnectStateChange={onConnectStateChange}
      />
    );
  },
);
