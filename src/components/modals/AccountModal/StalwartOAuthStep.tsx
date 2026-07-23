import { useQueryClient } from '@tanstack/react-query';
import Loader2 from 'lucide-react/icons/loader-2';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { ComposedInput } from '$components/ComposedInput';
import { ConnectionNoticeBanner } from '$components/ConnectionNoticeBanner';
import { useSettingsStore } from '$context/settingsContext';
import { useAddCalendar, useCreateAccount } from '$hooks/queries/useAccounts';
import { useSyncQuery } from '$hooks/queries/useSync';
import { useInitialFocusRef } from '$hooks/ui/useInitialFocusRef';
import {
  type StalwartTokens,
  startStalwartOAuth,
  usernameFromPrincipalUrl,
} from '$lib/auth/stalwart';
import { CalDAVClient } from '$lib/caldav';
import { type CalDAVSetupError, toCalDAVSetupError } from '$lib/caldav/setup';
import { hasHttpUrlScheme } from '$lib/caldav/utils';
import { loggers } from '$lib/logger';
import { ensureTagExists } from '$lib/store/sync';
import { createTask } from '$lib/store/tasks';

const log = loggers.account;

export type StalwartOAuthLoginStep = 'input' | 'browser' | 'processing';

export interface StalwartOAuthStepHandle {
  connect: () => void;
}

interface StalwartOAuthStepProps {
  serverUrl: string;
  onServerUrlChange: (url: string) => void;
  acceptInvalidCerts?: boolean;
  onSuccess: () => void;
  onStepChange: (step: StalwartOAuthLoginStep) => void;
  onConnectStateChange: (state: { disabled: boolean; loading: boolean }) => void;
}

type Phase = 'idle' | 'browser' | 'connecting' | 'done';

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
    const [phase, setPhase] = useState<Phase>('idle');
    const [error, setError] = useState<CalDAVSetupError | null>(null);
    const queryClient = useQueryClient();
    const createAccountMutation = useCreateAccount();
    const addCalendarMutation = useAddCalendar();
    const { syncAll } = useSyncQuery();
    const { enforceVapid } = useSettingsStore();
    const serverUrlInputRef = useInitialFocusRef<HTMLInputElement>();

    const isLoading = phase === 'browser' || phase === 'connecting';

    useEffect(() => {
      onStepChange(phase === 'idle' ? 'input' : phase === 'browser' ? 'browser' : 'processing');
    }, [phase, onStepChange]);

    useEffect(() => {
      onConnectStateChange({
        disabled: isLoading || !serverUrl.trim() || !hasHttpUrlScheme(serverUrl),
        loading: isLoading,
      });
    }, [isLoading, onConnectStateChange, serverUrl]);

    const handleConnect = async () => {
      if (!hasHttpUrlScheme(serverUrl)) {
        setError(
          toCalDAVSetupError(
            'Invalid server URL',
            'The server URL must start with http:// or https://.',
          ),
        );
        return;
      }

      setError(null);
      setPhase('browser');

      let tokens: StalwartTokens;
      try {
        tokens = await startStalwartOAuth(serverUrl, { acceptInvalidCerts });
      } catch (e) {
        log.error('[StalwartOAuth] OAuth flow failed:', e);
        setError(
          toCalDAVSetupError(
            'Stalwart OAuth failed',
            e,
            'Verify the server URL, port, and that the server is running. If the server uses a self-signed certificate, you may need to trust it.',
          ),
        );
        setPhase('idle');
        return;
      }

      setPhase('connecting');

      try {
        const { principalUrl, displayName } = await CalDAVClient.connectWithBearer(
          'stalwart-oauth-setup',
          serverUrl,
          tokens.username,
          tokens.accessToken,
          'stalwart',
          undefined,
          undefined,
          acceptInvalidCerts,
        );

        const username =
          tokens.username || usernameFromPrincipalUrl(principalUrl) || 'Stalwart account';

        const calendars =
          await CalDAVClient.getForAccount('stalwart-oauth-setup').fetchCalendars(enforceVapid);

        log.info(`[StalwartOAuth] Found ${calendars?.length ?? 0} calendars`, {
          serverUrl,
          displayName,
        });

        createAccountMutation.mutate(
          {
            name: displayName || username,
            caldav: {
              serverUrl,
              username,
              password: tokens.accessToken,
              serverType: 'stalwart',
              authType: 'oauth',
              refreshToken: tokens.refreshToken,
              tokenExpiry: tokens.tokenExpiry,
              oauthClientId: tokens.clientId,
              acceptInvalidCerts,
            },
          },
          {
            onSuccess: async (newAccount) => {
              try {
                for (const calendar of calendars ?? []) {
                  addCalendarMutation.mutate({ accountId: newAccount.id, calendarData: calendar });
                }

                log.debug('[StalwartOAuth] Fetching initial tasks');
                for (const calendar of calendars ?? []) {
                  try {
                    const remoteTasks = await CalDAVClient.getForAccount(newAccount.id).fetchTasks(
                      calendar,
                    );
                    if (!remoteTasks) continue;
                    for (const remoteTask of remoteTasks) {
                      let tagIds: string[] = [];
                      if (remoteTask.categoryId) {
                        const names = remoteTask.categoryId
                          .split(',')
                          .map((s: string) => s.trim())
                          .filter(Boolean);
                        tagIds = names.map((name: string) => ensureTagExists(name));
                      }
                      createTask({ ...remoteTask, tags: tagIds });
                    }
                  } catch (e) {
                    log.error(
                      `[StalwartOAuth] Failed to fetch tasks for ${calendar.displayName}:`,
                      e,
                    );
                  }
                }

                queryClient.invalidateQueries({ queryKey: ['tasks'] });
                queryClient.invalidateQueries({ queryKey: ['tags'] });

                setPhase('done');

                syncAll({
                  source: 'account-setup-stalwart',
                  reason: 'completed Stalwart OAuth account creation',
                  where: 'StalwartOAuthStep',
                });

                onSuccess();
              } catch (e) {
                log.error('[StalwartOAuth] Post-create setup failed:', e);
                onSuccess();
              }
            },
            onError: (e) => {
              setError(
                toCalDAVSetupError(
                  'Failed to create account',
                  e,
                  'The account could not be saved. Try again or check the logs for details.',
                ),
              );
              setPhase('idle');
            },
          },
        );
      } catch (e) {
        log.error('[StalwartOAuth] Failed to connect to Stalwart:', e);
        setError(
          toCalDAVSetupError(
            'Could not connect to Stalwart',
            e,
            'The account could not be set up after authorization.',
          ),
        );
        setPhase('idle');
      }
    };

    useImperativeHandle(ref, () => ({ connect: handleConnect }));

    if (phase === 'browser') {
      return (
        <div className="py-8 text-center">
          <Loader2 className="mx-auto mb-3 h-10 w-10 text-primary-500 motion-safe:animate-spin" />
          <h3 className="mb-1 font-medium text-base text-surface-800 dark:text-surface-200">
            Waiting for authorization...
          </h3>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Complete the login in your browser
          </p>
        </div>
      );
    }

    if (phase === 'connecting') {
      return (
        <div className="py-8 text-center">
          <Loader2 className="mx-auto mb-3 h-10 w-10 text-primary-500 motion-safe:animate-spin" />
          <h3 className="mb-1 font-medium text-base text-surface-800 dark:text-surface-200">
            Setting up your account...
          </h3>
          <p className="text-sm text-surface-500 dark:text-surface-400">Importing calendars</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 p-4">
        <div>
          <label
            htmlFor="stalwart-oauth-url"
            className="mb-1 block font-medium text-sm text-surface-700 dark:text-surface-300"
          >
            Stalwart Server URL
          </label>
          <ComposedInput
            id="stalwart-oauth-url"
            ref={serverUrlInputRef}
            type="text"
            placeholder="https://mail.example.com"
            value={serverUrl}
            onChange={onServerUrlChange}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading && hasHttpUrlScheme(serverUrl)) handleConnect();
            }}
            className="w-full rounded-lg border border-transparent bg-surface-100 px-3 py-2 text-sm text-surface-800 transition-colors focus:border-primary-500 focus:bg-white focus:outline-hidden dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
          />
          <p className="mt-1.5 text-surface-500 text-xs dark:text-surface-400">
            Your browser will open for authentication
          </p>
        </div>

        {error && (
          <ConnectionNoticeBanner
            success={false}
            error={error}
            notice={null}
            calendarCount={0}
            onDismiss={() => setError(null)}
          />
        )}
      </div>
    );
  },
);
StalwartOAuthStep.displayName = 'StalwartOAuthStep';
