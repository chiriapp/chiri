/**
 * Delete handlers for accounts, calendars, and tags
 */

import { useQueryClient } from '@tanstack/react-query';
import { useSettingsStore } from '@/context/settingsContext';
import { useDeleteAccount, useDeleteTag, useSetAllTasksView } from '@/hooks/queries';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { caldavService } from '@/lib/caldav';
import { createLogger } from '@/lib/logger';
import * as taskData from '@/lib/taskData';
import type { Account, Tag } from '@/types';

const log = createLogger('DeleteHandlers', '#ef4444');

/**
 * Hook providing handlers for deleting accounts, calendars, and tags
 */
export function useDeleteHandlers() {
  const queryClient = useQueryClient();
  const { confirm, setLoading, close } = useConfirmDialog();
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

    if (confirmBeforeDeleteCalendar) {
      const confirmed = await confirm({
        title: 'Delete calendar',
        subtitle: calendar?.displayName,
        message: 'Are you sure? This calendar and all its tasks will be deleted from the server.',
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!confirmed) return;
    }

    // Show loading state in the confirm dialog
    setLoading(true);

    // Check if this is the active calendar
    const isActiveCalendar = activeCalendarId === calendarId;

    // Delete calendar from server
    try {
      await caldavService.deleteCalendar(accountId, calendarId);
      // Delete calendar and its tasks from local state
      taskData.deleteCalendar(accountId, calendarId);

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
    } finally {
      // Close the dialog after deletion completes
      close();
    }
  };

  return {
    handleDeleteAccount,
    handleDeleteTag,
    handleDeleteCalendar,
  };
}
