import { useQueryClient } from '@tanstack/react-query';
import type { SyntheticEvent } from 'react';
import { useState } from 'react';
import { useAddCalendar, useCreateAccount, useUpdateAccount } from '$hooks/queries/useAccounts';
import { discoverAccountCalendars, fetchTasksForCalendar } from '$lib/account/setup';
import type { ConnectWithCertHandling } from '$lib/account/test';
import {
  type CalDAVSetupError,
  type CalDAVSetupNotice,
  getCalDAVErrorInfo,
} from '$lib/caldav/setup';
import { loggers } from '$lib/logger';
import { queryKeys } from '$lib/queryClient';
import type { Account, AccountDraft } from '$types/account';
import type { Calendar } from '$types/calendar';

const log = loggers.account;

interface UseAccountSetupOptions {
  account: Account | null;
  draft: AccountDraft;
  enforceVapid: boolean;
  testSuccess: boolean;
  testConnectionId: string | null;
  testedCalendars: Calendar[];
  connectWithCertHandling: ConnectWithCertHandling;
  validateServerUrlScheme: () => boolean;
  validatePrincipalUrl: (baseUrl: string) => boolean;
  confirmServerWarning: (calendarHome?: string) => Promise<boolean>;
  confirmServerUrlWarning: (url: string) => Promise<boolean>;
  setSetupError: (error: CalDAVSetupError | null) => void;
  setSetupNotice: (notice: CalDAVSetupNotice | null) => void;
  cancelTestConnection: () => void;
  onClose: () => void;
}

export const useAccountSetup = ({
  account,
  draft,
  enforceVapid,
  testSuccess,
  testConnectionId,
  testedCalendars,
  connectWithCertHandling,
  validateServerUrlScheme,
  validatePrincipalUrl,
  confirmServerWarning,
  confirmServerUrlWarning,
  setSetupError,
  setSetupNotice,
  cancelTestConnection,
  onClose,
}: UseAccountSetupOptions) => {
  const queryClient = useQueryClient();
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();
  const addCalendarMutation = useAddCalendar();
  const [isLoading, setIsLoading] = useState(false);

  const updateExistingAccount = async (effectivePassword: string | undefined) => {
    if (!validateServerUrlScheme()) return false;
    const trimmedServerUrl = draft.serverUrl.trim();
    if (!validatePrincipalUrl(trimmedServerUrl)) return false;

    const existingCalDav = account?.caldav;
    if (!account || !existingCalDav) return false;

    const connectionSettingsChanged =
      draft.serverType !== (existingCalDav.serverType || 'generic') ||
      trimmedServerUrl !== existingCalDav.serverUrl ||
      draft.username !== existingCalDav.username ||
      draft.calendarHomeUrl.trim() !== (existingCalDav.calendarHomeUrl || '') ||
      draft.principalUrl.trim() !== (existingCalDav.principalUrl || '') ||
      draft.acceptInvalidCerts !== (existingCalDav.acceptInvalidCerts ?? false) ||
      draft.password.trim().length > 0;

    if (connectionSettingsChanged && effectivePassword) {
      log.debug(`Testing connection to ${trimmedServerUrl}...`);
      const result = await connectWithCertHandling(account.id, effectivePassword, trimmedServerUrl);
      if (!result) return false;
    }

    await updateAccountMutation.mutateAsync({
      id: account.id,
      updates: {
        name: draft.name,
        icon: draft.icon,
        emoji: draft.emoji,
        caldav: {
          serverUrl: trimmedServerUrl,
          username: draft.username,
          password: effectivePassword || existingCalDav.password,
          serverType: draft.serverType,
          calendarHomeUrl: draft.calendarHomeUrl.trim() || undefined,
          principalUrl: draft.principalUrl.trim() || undefined,
          acceptInvalidCerts: draft.acceptInvalidCerts || undefined,
          authType: existingCalDav.authType,
          refreshToken: existingCalDav.refreshToken,
          tokenExpiry: existingCalDav.tokenExpiry,
        },
      },
    });

    return true;
  };

  const createNewAccount = async (effectivePassword: string) => {
    const accountSetup = await discoverAccountCalendars({
      draft,
      enforceVapid,
      effectivePassword,
      testSuccess,
      testConnectionId,
      testedCalendars,
      connectWithCertHandling,
      validateServerUrlScheme,
      validatePrincipalUrl,
      confirmServerWarning,
      confirmServerUrlWarning,
    });
    if (!accountSetup) return false;

    const { testConnectionId: newAccountId, calendars, serverUrl } = accountSetup;
    setSetupNotice(accountSetup.notice);

    try {
      const newAccount = await createAccountMutation.mutateAsync({
        id: newAccountId,
        name: draft.name,
        icon: draft.icon,
        emoji: draft.emoji,
        caldav: {
          serverUrl,
          username: draft.username,
          password: effectivePassword,
          serverType: draft.serverType,
          calendarHomeUrl: draft.calendarHomeUrl.trim() || undefined,
          principalUrl: draft.principalUrl.trim() || undefined,
          acceptInvalidCerts: draft.acceptInvalidCerts || undefined,
          authType: 'basic',
        },
      });

      for (const calendar of calendars) {
        await addCalendarMutation.mutateAsync({
          accountId: newAccount.id,
          calendarData: calendar,
        });
      }

      log.debug('Fetching tasks for all calendars...');
      for (const calendar of calendars) {
        await fetchTasksForCalendar(newAccount.id, calendar);
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
      onClose();
    } catch (error) {
      log.error('Error setting up account:', error);
      setSetupError(
        getCalDAVErrorInfo(error, 'Failed to create account', draft.serverType, draft.serverUrl),
      );
    }

    return true;
  };

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    setSetupError(null);
    setSetupNotice(null);
    setIsLoading(true);

    try {
      const effectivePassword = draft.password || account?.caldav?.password;

      if (account) {
        const didUpdate = await updateExistingAccount(effectivePassword);
        if (!didUpdate) {
          setIsLoading(false);
          return;
        }
        cancelTestConnection();
        onClose();
      } else {
        if (!effectivePassword) {
          throw new Error('Password is required');
        }

        const didStartCreate = await createNewAccount(effectivePassword);
        if (!didStartCreate) {
          setIsLoading(false);
        }
        return;
      }
    } catch (error) {
      setSetupError(
        getCalDAVErrorInfo(
          error,
          'Failed to connect to CalDAV server',
          draft.serverType,
          draft.serverUrl,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, handleSubmit };
};
