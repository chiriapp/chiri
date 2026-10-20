import { useQueryClient } from '@tanstack/react-query';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import {
  BrowserAuthFlowStep,
  type BrowserAuthFlowStepHandle,
  type BrowserAuthFlowStepPhase,
} from '$components/modals/AccountModal/steps/BrowserAuthFlowStep';
import { useSettingsStore } from '$context/settingsContext';
import { useAddCalendar, useCreateAccount } from '$hooks/queries/useAccounts';
import { fetchTasksForCalendar } from '$lib/account/setup';
import { cancelNextcloudLogin, initiateNextcloudLogin } from '$lib/auth/nextcloud';
import { CalDAVClient } from '$lib/caldav';
import { loggers } from '$lib/logger';
import { queryKeys } from '$lib/queryClient';
import { generateUUID } from '$utils/misc';

const log = loggers.account;

const DISROOT_CLOUD_URL = 'https://cloud.disroot.org';

export interface DisrootCloudBrowserLoginStepHandle {
  cancel: () => void;
  connect: () => void;
  getPhase: () => BrowserAuthFlowStepPhase;
}

interface DisrootCloudBrowserLoginStepProps {
  onSuccess: () => void;
  onSetupInProgressChange: (inProgress: boolean) => void;
  onConnectStateChange?: (state: { disabled: boolean; loading: boolean }) => void;
}

export const DisrootCloudBrowserLoginStep = forwardRef<
  DisrootCloudBrowserLoginStepHandle,
  DisrootCloudBrowserLoginStepProps
>(({ onSuccess, onSetupInProgressChange, onConnectStateChange }, ref) => {
  const flowRef = useRef<BrowserAuthFlowStepHandle>(null);
  const queryClient = useQueryClient();
  const createAccountMutation = useCreateAccount();
  const addCalendarMutation = useAddCalendar();
  const { enforceVapid } = useSettingsStore();

  useEffect(() => {
    return () => {
      cancelNextcloudLogin();
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
    const onAbort = () => {
      cancelNextcloudLogin();
    };
    signal.addEventListener('abort', onAbort);

    try {
      if (signal.aborted) {
        throw new DOMException('Login flow cancelled', 'AbortError');
      }

      setPhase('browser');
      const credentials = await initiateNextcloudLogin(DISROOT_CLOUD_URL);

      if (signal.aborted) {
        throw new DOMException('Login flow cancelled', 'AbortError');
      }

      try {
        await getCurrentWindow().setFocus();
      } catch (err) {
        log.warn('[DisrootCloudBrowserLogin] Failed to focus window after authentication', {
          error: err,
        });
      }

      setPhase('connecting');

      const accountId = generateUUID();
      await CalDAVClient.connect(
        accountId,
        credentials.server,
        credentials.loginName,
        credentials.appPassword,
        'disrootCloud',
      );

      const calendars = await CalDAVClient.getForAccount(accountId).fetchCalendars(enforceVapid);

      await createAccountMutation.mutateAsync({
        id: accountId,
        name: `${credentials.loginName} (Disroot Cloud)`,
        icon: 'user',
        caldav: {
          serverUrl: credentials.server,
          username: credentials.loginName,
          password: credentials.appPassword,
          serverType: 'disrootCloud',
          authType: 'basic',
        },
      });

      if (calendars.length > 0) {
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
    getPhase: () => flowRef.current?.getPhase() ?? 'idle',
  }));

  return (
    <BrowserAuthFlowStep
      ref={flowRef}
      providerName="Disroot Cloud"
      serverType="disrootCloud"
      startFlow={startFlow}
      onSuccess={onSuccess}
      onPhaseChange={(phase) => {
        onSetupInProgressChange(phase === 'connecting');
      }}
      onConnectStateChange={onConnectStateChange}
    />
  );
});
