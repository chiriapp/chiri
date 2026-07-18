import Activity from 'lucide-react/icons/activity';
import Download from 'lucide-react/icons/download';
import Edit2 from 'lucide-react/icons/edit-2';
import Loader2 from 'lucide-react/icons/loader-2';
import Plus from 'lucide-react/icons/plus';
import Trash2 from 'lucide-react/icons/trash-2';
import User from 'lucide-react/icons/user';
import { useMemo, useState } from 'react';
import { ConnectionNoticeBanner } from '$components/ConnectionNoticeBanner';
import { MobileConfigExportModal } from '$components/modals/MobileConfigExportModal';
import { WebDAVPushAccountStatus } from '$components/settings/ConnectionSettings/WebDAVPushAccountStatus';
import { Tooltip } from '$components/Tooltip';
import { useConnectionStore } from '$context/connectionContext';
import { useSettingsStore } from '$context/settingsContext';
import { useAccountDeletion } from '$hooks/deletion/useAccountDeletion';
import { useTasks } from '$hooks/queries/useTasks';
import { CalDAVClient } from '$lib/caldav';
import type { CalDAVSetupError, CalDAVSetupNotice } from '$lib/caldav/setup';
import {
  getSetupErrorInfo,
  getSetupNotice,
  probeSetupVtodoCreationIfNeeded,
} from '$lib/caldav/setup';
import { exportMobileConfigFile } from '$lib/mobileconfig/export';
import type { Account } from '$types';
import { pluralize } from '$utils/misc';

interface ConnectionsSettingsProps {
  accounts: Account[];
  onAddAccount: () => void;
  onEditAccount: (accountId: string) => void;
}

export const ConnectionsSettings = ({
  accounts: allAccounts,
  onAddAccount,
  onEditAccount,
}: ConnectionsSettingsProps) => {
  const accounts = allAccounts.filter((a) => a.caldav);
  const { enforceVapid } = useSettingsStore();
  const { deleteAccount } = useAccountDeletion();
  const { hasConnection } = useConnectionStore();
  const { data: tasks = [] } = useTasks();

  const [testingAccounts, setTestingAccounts] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<
    Record<
      string,
      {
        success: boolean;
        error: CalDAVSetupError | null;
        notice: CalDAVSetupNotice | null;
        calendarCount: number;
      }
    >
  >({});
  const [exportingAccount, setExportingAccount] = useState<Account | null>(null);

  // calculate task counts per account
  const accountStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const account of accounts) {
      stats[account.id] = tasks.filter((t) => t.accountId === account.id).length;
    }
    return stats;
  }, [accounts, tasks]);

  const handleDeleteAccount = async (account: { id: string; name: string }) => {
    await deleteAccount(account.id, allAccounts);
  };

  const handleEditAccount = (accountId: string) => {
    onEditAccount(accountId);
  };

  const handleDismissTestResult = (accountId: string) => {
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[accountId];
      return next;
    });
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
      const client = CalDAVClient.getForAccount(account.id);
      const { calendars, diagnostics } = await client.discoverCalendars(enforceVapid);
      const canCreateVtodoCalendar = await probeSetupVtodoCreationIfNeeded(
        client,
        diagnostics,
        enforceVapid,
      );

      setTestResults((prev) => ({
        ...prev,
        [account.id]: {
          success: true,
          error: null,
          notice: getSetupNotice(diagnostics, canCreateVtodoCalendar),
          calendarCount: calendars.length,
        },
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [account.id]: {
          success: false,
          error: getSetupErrorInfo(
            error,
            'Failed to test CalDAV connection',
            account.caldav?.serverType ?? 'generic',
            account.caldav?.serverUrl ?? '',
          ),
          notice: null,
          calendarCount: 0,
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
    onAddAccount();
  };

  const handleExportMobileConfig = (account: Account) => {
    setExportingAccount(account);
  };

  const handleConfirmExport = async (includePassword: boolean) => {
    if (!exportingAccount) return;

    try {
      const result = await exportMobileConfigFile(exportingAccount, { includePassword });
      if (result !== 'cancelled') {
        setExportingAccount(null);
      }
    } catch (err) {
      console.error('Failed to export .mobileconfig:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">
          Connections
        </h3>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddAccount}
            className="flex items-center gap-1.5 rounded-sm bg-surface-100 px-2 py-1 text-surface-700 text-xs outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Account
          </button>
        </div>
      </div>

      <div>
        {accounts.length === 0 ? (
          <div className="rounded-lg border border-surface-200 p-4 dark:border-surface-700">
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
                  className="overflow-hidden rounded-lg border border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-900/50"
                >
                  <div className="flex justify-between gap-3 p-4">
                    <div className="flex flex-col">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="flex flex-row items-center gap-1.5 font-medium text-sm text-surface-700 dark:text-surface-300">
                          <User className="h-4 w-4 shrink-0 text-surface-500 dark:text-surface-400" />
                          {account.name}
                        </p>
                        {!isConnected && (
                          <span className="text-semantic-warning text-xs">Disconnected</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-surface-500 text-xs dark:text-surface-400">
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

                      <WebDAVPushAccountStatus account={account} />
                    </div>

                    <div className="flex items-center justify-center gap-1">
                      <Tooltip content="Edit account" position="bottom" allowInModal>
                        <button
                          type="button"
                          onClick={() => handleEditAccount(account.id)}
                          className="rounded-sm p-1.5 text-surface-600 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-600"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Export to .mobileconfig" position="bottom" allowInModal>
                        <button
                          type="button"
                          onClick={() => handleExportMobileConfig(account)}
                          className="rounded-sm p-1.5 text-surface-600 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-600"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Test connection" position="bottom" allowInModal>
                        <button
                          type="button"
                          onClick={() => handleTestConnection(account)}
                          disabled={isTesting}
                          className="rounded-sm p-1.5 text-surface-600 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset disabled:opacity-50 dark:text-surface-400 dark:hover:bg-surface-600"
                        >
                          {isTesting ? (
                            <Loader2 className="h-5 w-5 motion-safe:animate-spin" />
                          ) : (
                            <Activity className="h-5 w-5" />
                          )}
                        </button>
                      </Tooltip>
                      <Tooltip content="Remove account" position="bottom" allowInModal>
                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(account)}
                          className="rounded-sm p-1.5 text-semantic-error outline-hidden transition-colors hover:bg-semantic-error/10 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  {testResult && (
                    <div className="px-4 pb-3">
                      <ConnectionNoticeBanner
                        success={testResult.success}
                        error={testResult.error}
                        notice={testResult.notice}
                        calendarCount={testResult.calendarCount}
                        onDismiss={() => handleDismissTestResult(account.id)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {exportingAccount && (
        <MobileConfigExportModal
          account={exportingAccount}
          onConfirm={handleConfirmExport}
          onClose={() => setExportingAccount(null)}
        />
      )}
    </div>
  );
};
