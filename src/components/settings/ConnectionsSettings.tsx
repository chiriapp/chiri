import { emit } from '@tauri-apps/api/event';
import Activity from 'lucide-react/icons/activity';
import Edit2 from 'lucide-react/icons/edit-2';
import Loader2 from 'lucide-react/icons/loader-2';
import Plus from 'lucide-react/icons/plus';
import Trash2 from 'lucide-react/icons/trash-2';
import User from 'lucide-react/icons/user';
import { useMemo, useState } from 'react';
import { Tooltip } from '$components/Tooltip';
import { MENU_EVENTS } from '$constants/menu';
import { useDeleteAccount } from '$hooks/queries/useAccounts';
import { useTasks } from '$hooks/queries/useTasks';
import { useConfirmDialog } from '$hooks/store/useConfirmDialog';
import { useConnectionStore } from '$hooks/store/useConnectionStore';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { CalDAVClient } from '$lib/caldav';
import type { Account } from '$types';
import { pluralize } from '$utils/misc';

interface ConnectionsSettingsProps {
  accounts: Account[];
}

export const ConnectionsSettings = ({ accounts }: ConnectionsSettingsProps) => {
  const deleteAccountMutation = useDeleteAccount();
  const { confirm } = useConfirmDialog();
  const { confirmBeforeDeleteAccount } = useSettingsStore();
  const { hasConnection } = useConnectionStore();
  const { data: tasks = [] } = useTasks();

  const [testingAccounts, setTestingAccounts] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({});

  // Calculate task counts per account
  const accountStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const account of accounts) {
      stats[account.id] = tasks.filter((t) => t.accountId === account.id).length;
    }
    return stats;
  }, [accounts, tasks]);

  const handleDeleteAccount = async (account: { id: string; name: string }) => {
    if (confirmBeforeDeleteAccount) {
      const confirmed = await confirm({
        title: 'Remove account',
        subtitle: account.name,
        message: `Are you sure? All tasks from this account will be removed from the app. They will remain on the server.`,
        confirmLabel: 'Remove',
        cancelLabel: 'Cancel',
        destructive: true,
      });
      if (!confirmed) {
        return;
      }
    }
    deleteAccountMutation.mutate(account.id);
  };

  const handleEditAccount = (accountId: string) => {
    emit(MENU_EVENTS.EDIT_ACCOUNT, { accountId });
  };

  const handleTestConnection = async (account: Account) => {
    setTestingAccounts((prev) => new Set(prev).add(account.id));
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[account.id];
      return next;
    });

    try {
      await CalDAVClient.reconnect(account);
      const calendars = await CalDAVClient.getForAccount(account.id).fetchCalendars();

      setTestResults((prev) => ({
        ...prev,
        [account.id]: {
          success: true,
          message: `Connected successfully. Found ${calendars.length} ${pluralize(calendars.length, 'calendar', 'calendars')}.`,
        },
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [account.id]: {
          success: false,
          message: error instanceof Error ? error.message : 'Connection test failed',
        },
      }));
    } finally {
      setTestingAccounts((prev) => {
        const next = new Set(prev);
        next.delete(account.id);
        return next;
      });
    }
  };

  const handleAddAccount = () => {
    emit(MENU_EVENTS.ADD_ACCOUNT);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">
          Connections
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddAccount}
            className="flex items-center gap-1.5 px-2 py-1 text-xs bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 rounded-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Account
          </button>
        </div>
      </div>

      <div>
        {accounts.length === 0 ? (
          <div className="rounded-lg border border-surface-200 dark:border-surface-700 p-4">
            <p className="text-sm text-surface-500 dark:text-surface-400">
              No accounts connected yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => {
              const isConnected = hasConnection(account.id);
              const isTesting = testingAccounts.has(account.id);
              const testResult = testResults[account.id];
              const taskCount = accountStats[account.id] || 0;

              return (
                <div
                  key={account.id}
                  className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 p-4"
                >
                  <div className="flex justify-between gap-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="flex flex-row gap-1.5 items-center text-sm font-medium text-surface-700 dark:text-surface-300">
                          <User className="w-4 h-4 text-surface-500 dark:text-surface-400 shrink-0" />
                          {account.name}
                        </p>
                        {!isConnected && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            Disconnected
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
                        <span>
                          {account.calendars.length}{' '}
                          {pluralize(account.calendars.length, 'calendar', 'calendars')}
                        </span>
                        {taskCount > 0 && (
                          <>
                            <span>•</span>
                            <span>
                              {taskCount} {pluralize(taskCount, 'task', 'tasks')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-center items-center gap-1">
                      <Tooltip content="Edit account" position="bottom" allowInModal>
                        <button
                          type="button"
                          onClick={() => handleEditAccount(account.id)}
                          className="p-1.5 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Test connection" position="bottom" allowInModal>
                        <button
                          type="button"
                          onClick={() => handleTestConnection(account)}
                          disabled={isTesting}
                          className="p-1.5 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset disabled:opacity-50"
                        >
                          {isTesting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Activity className="w-5 h-5" />
                          )}
                        </button>
                      </Tooltip>
                      <Tooltip content="Remove account" position="bottom" allowInModal>
                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(account)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  {testResult && (
                    <div
                      className={`p-2 rounded-lg text-xs mt-3 ${
                        testResult.success
                          ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}
                    >
                      {testResult.message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
