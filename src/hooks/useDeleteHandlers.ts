/**
 * Delete handlers for accounts, calendars, and tags
 */

import { useQueryClient } from '@tanstack/react-query';
import { useDeleteAccount } from '$hooks/queries/useAccounts';
import { useDeleteTag } from '$hooks/queries/useTags';
import { useSetAllTasksView } from '$hooks/queries/useUIState';
import { useConfirmDialog } from '$hooks/store/useConfirmDialog';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { CalDAVClient } from '$lib/caldav';
import { loggers } from '$lib/logger';
import { deleteCalendar as storeDeleteCalendar } from '$lib/store/calendars';
import type { Account, Tag } from '$types';

const log = loggers.deleteHandlers;

/**
 * Hook providing handlers for deleting accounts, calendars, and tags
 */
export const useDeleteHandlers = () => {
  const queryClient = useQueryClient();
  const { confirm, setLoading, setError, close } = useConfirmDialog();
  const { confirmBeforeDeleteAccount, confirmBeforeDeleteCalendar, confirmBeforeDeleteTag } =
    useSettingsStore();

  const deleteAccountMutation = useDeleteAccount();
  const deleteTagMutation = useDeleteTag();
  const setAllTasksViewMutation = useSetAllTasksView();

  /**
   * Delete an account with confirmation
   */
  const handleDeleteAccount = async (accountId: string, accounts: Account[]) => {
    const account = accounts.find((a) => a.id === accountId);
    if (confirmBeforeDeleteAccount) {
      const confirmed = await confirm({
        title: 'Remove account',
        subtitle: account?.name,
        message:
          'Are you sure? All tasks from this account will be removed from the app. They will remain on the server.',
        confirmLabel: 'Remove',
        destructive: true,
      });
      if (!confirmed) return;
    }
    deleteAccountMutation.mutate(accountId);
    close();
  };

  /**
   * Delete a tag with confirmation
   */
  const handleDeleteTag = async (tagId: string, tags: Tag[]) => {
    const tag = tags.find((t) => t.id === tagId);
    if (confirmBeforeDeleteTag) {
      const confirmed = await confirm({
        title: 'Delete tag',
        subtitle: tag?.name,
        message: 'Are you sure? Tasks with this tag will not be affected.',
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!confirmed) return;
    }
    deleteTagMutation.mutate(tagId);
    close();
  };

  /**
   * Delete a calendar with confirmation
   */
  const handleDeleteCalendar = async (
    calendarId: string,
    accountId: string,
    accounts: Account[],
    activeCalendarId?: string | null,
  ) => {
    const account = accounts.find((a) => a.id === accountId);
    const calendar = account?.calendars.find((c) => c.id === calendarId);

    const isVikunja =
      account?.serverType === 'vikunja' || calendar?.url.includes('/dav/projects/');
    const projectId = calendar?.url.match(/\/dav\/projects\/(\d+)/)?.[1];
    const vikunjaDeleteUrl =
      isVikunja && projectId
        ? `${account?.serverUrl.replace(/\/$/, '')}/projects/${projectId}/settings/delete`
        : undefined;

    if (isVikunja || confirmBeforeDeleteCalendar) {
      const confirmed = await confirm({
        title: 'Delete calendar',
        subtitle: calendar?.displayName,
        message: isVikunja
          ? undefined
          : 'Are you sure? This calendar and all its tasks will be deleted from the server.',
        confirmLabel: 'Delete',
        destructive: true,
        notice: isVikunja
          ? {
              message: "Vikunja doesn't support deleting projects via CalDAV.",
              link: vikunjaDeleteUrl
                ? { label: 'Delete it in Vikunja', href: vikunjaDeleteUrl }
                : undefined,
              suffix: ', then sync.',
            }
          : undefined,
        disableConfirm: isVikunja,
      });
      if (!confirmed) return;
    }

    // Show loading state in the confirm dialog
    setLoading(true);

    // Check if this is the active calendar
    const isActiveCalendar = activeCalendarId === calendarId;

    // Delete calendar from server
    try {
      await CalDAVClient.getForAccount(accountId).deleteCalendar(calendarId);
      // Delete calendar and its tasks from local state
      storeDeleteCalendar(accountId, calendarId);

      // If this was the active calendar, redirect to All Tasks
      if (isActiveCalendar) {
        setAllTasksViewMutation.mutate();
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['uiState'] });
    } catch (error) {
      log.error('Failed to delete calendar:', error);
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setLoading(false);
      setError(message);
      return;
    }

    close();
  };

  return {
    handleDeleteAccount,
    handleDeleteTag,
    handleDeleteCalendar,
  };
};
