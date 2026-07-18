import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useConfirmDialog } from '$context/confirmDialogContext';
import { useSetAllTasksView } from '$hooks/queries/useUIState';
import { CalDAVClient } from '$lib/caldav';
import { loggers } from '$lib/logger';
import { disablePushForCalendar } from '$lib/push';
import { deleteCalendar as storeDeleteCalendar } from '$lib/store/calendars';
import type { Account } from '$types';

const log = loggers.deleteHandlers;

const disablePushBeforeCalendarDeletion = async (accountId: string, calendarId: string) => {
  try {
    await disablePushForCalendar(accountId, calendarId);
  } catch (error) {
    log.warn('Failed to disable push before deleting calendar:', error);
  }
};

export const useCalendarDeletion = () => {
  const queryClient = useQueryClient();
  const setAllTasksViewMutation = useSetAllTasksView();
  const { confirm, setLoading, setError, close } = useConfirmDialog();

  const deleteCalendar = useCallback(
    async (
      calendarId: string,
      accountId: string,
      accounts: Account[],
      activeCalendarId?: string | null,
    ) => {
      const account = accounts.find((a) => a.id === accountId);
      const calendar = account?.calendars.find((c) => c.id === calendarId);

      const isVikunja =
        account?.caldav?.serverType === 'vikunja' || calendar?.url.includes('/dav/projects/');
      const projectId = calendar?.url.match(/\/dav\/projects\/(\d+)/)?.[1];
      const vikunjaDeleteUrl =
        isVikunja && projectId
          ? `${account?.caldav?.serverUrl.replace(/\/$/, '')}/projects/${projectId}/settings/delete`
          : undefined;

      const isLocal = !account?.caldav;
      const deleteMessage = isLocal
        ? 'Are you sure? This calendar and all its tasks will be permanently deleted.'
        : 'Are you sure? This calendar and all its tasks will be deleted from the server.';
      const vikunjaNotice = isVikunja
        ? {
            message: "Vikunja doesn't support deleting projects via CalDAV.",
            link: vikunjaDeleteUrl
              ? { label: 'Delete it in Vikunja', href: vikunjaDeleteUrl }
              : undefined,
            suffix: ', then sync.',
          }
        : undefined;

      const confirmed = await confirm({
        title: 'Delete calendar',
        subtitle: calendar?.displayName,
        message: isVikunja ? undefined : deleteMessage,
        confirmLabel: 'Delete',
        destructive: true,
        notice: vikunjaNotice,
        disableConfirm: isVikunja,
        keepOpenOnConfirm: true,
      });
      if (!confirmed) return false;

      setLoading(true);

      try {
        await disablePushBeforeCalendarDeletion(accountId, calendarId);

        if (account?.caldav) {
          await CalDAVClient.getForAccount(accountId).deleteCalendar(calendarId);
        }

        storeDeleteCalendar(accountId, calendarId);

        if (activeCalendarId === calendarId) {
          setAllTasksViewMutation.mutate();
        }

        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['uiState'] });
      } catch (error) {
        log.error('Failed to delete calendar:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        setLoading(false);
        setError(message);
        return false;
      }

      close();
      return true;
    },
    [close, confirm, queryClient, setAllTasksViewMutation, setError, setLoading],
  );

  return { deleteCalendar };
};
