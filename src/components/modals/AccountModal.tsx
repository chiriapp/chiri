import { useQueryClient } from '@tanstack/react-query';
import Info from 'lucide-react/icons/info';
import Loader2 from 'lucide-react/icons/loader-2';
import X from 'lucide-react/icons/x';
import { useEffect, useRef, useState } from 'react';
import { ComposedInput } from '$components/ComposedInput';
import {
  getPredefinedServerUrl,
  getServerTypeDescription,
  SERVER_TYPE_GROUPS,
} from '$data/settings';
import { useAddCalendar, useCreateAccount, useUpdateAccount } from '$hooks/queries/useAccounts';
import { useConfirmDialog } from '$hooks/useConfirmDialog';
import { useFocusTrap } from '$hooks/useFocusTrap';
import { useModalEscapeKey } from '$hooks/useModalEscapeKey';
import { caldavService } from '$lib/caldav';
import { loggers } from '$lib/logger';
import { createTag, getAllTags } from '$lib/store/tags';
import { createTask } from '$lib/store/tasks';
import type { Account, Calendar, ServerType } from '$types/index';
import { generateTagColor } from '$utils/color';
import { generateUUID } from '$utils/misc';
import type { CalDAVConfig } from '$utils/mobileconfig';

const log = loggers.account;

interface AccountModalProps {
  account: Account | null;
  onClose: () => void;
  preloadedConfig?: CalDAVConfig;
}

export const AccountModal = ({ account, onClose, preloadedConfig }: AccountModalProps) => {
  const queryClient = useQueryClient();
  const { confirm } = useConfirmDialog();
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();
  const addCalendarMutation = useAddCalendar();

  const [name, setName] = useState(() => preloadedConfig?.accountName || account?.name || '');
  const [serverUrl, setServerUrl] = useState(
    () => preloadedConfig?.serverUrl || account?.serverUrl || '',
  );
  const [username, setUsername] = useState(
    () => preloadedConfig?.username || account?.username || '',
  );
  const [password, setPassword] = useState(() => preloadedConfig?.password || '');
  const [serverType, setServerType] = useState<ServerType>(
    () => preloadedConfig?.serverType || account?.serverType || 'generic',
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const focusTrapRef = useFocusTrap();

  // handle ESC key to close modal
  useModalEscapeKey(onClose);

  // Autofocus name input after modal is mounted and visible
  useEffect(() => {
    // Delay to ensure modal animation (150ms) has completed
    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // prefill server URL when server type changes to one with a predefined URL
  useEffect(() => {
    if (!account && !preloadedConfig) {
      // only for new accounts without preloaded config: set predefined URL or clear if none exists
      const predefinedUrl = getPredefinedServerUrl(serverType);
      setServerUrl(predefinedUrl || '');
    }
  }, [serverType, account, preloadedConfig]);

  /**
   * ensure a tag exists by name, returns the tag ID
   */
  const ensureTagExists = (tagName: string): string => {
    const currentTags = getAllTags();
    const existing = currentTags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());

    if (existing) {
      return existing.id;
    }

    const newTag = createTag({
      name: tagName,
      color: generateTagColor(tagName),
    });

    return newTag.id;
  };

  /**
   * fetch tasks for a calendar and store them locally
   */
  const fetchTasksForCalendar = async (accountId: string, calendar: Calendar) => {
    try {
      const remoteTasks = await caldavService.fetchTasks(accountId, calendar);

      if (!remoteTasks) {
        log.warn(`No tasks fetched from ${calendar.displayName}`);
        return;
      }

      log.info(`Fetched ${remoteTasks.length} tasks from ${calendar.displayName}`);

      for (const remoteTask of remoteTasks) {
        // Extract category/tag from the task and create if needed
        let tagIds: string[] = [];
        if (remoteTask.categoryId) {
          const categoryNames = remoteTask.categoryId
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
          tagIds = categoryNames.map((name: string) => ensureTagExists(name));
        }

        // Add the task with tags
        createTask({
          ...remoteTask,
          tags: tagIds,
        });
      }
    } catch (error) {
      log.error(`Failed to fetch tasks for calendar ${calendar.displayName}:`, error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const effectivePassword = password || account?.password;

      if (account) {
        // update existing account
        if (effectivePassword) {
          // test connection with new credentials before saving
          log.debug(`Testing connection to ${serverUrl}...`);
          await caldavService.connect(
            account.id,
            serverUrl,
            username,
            effectivePassword,
            serverType,
          );
        }

        updateAccountMutation.mutate({
          id: account.id,
          updates: {
            name,
            serverUrl,
            username,
            password: effectivePassword || account.password,
            serverType,
          },
        });
      } else {
        // for new accounts, first test connection before adding to store
        if (!effectivePassword) {
          throw new Error('Password is required');
        }

        // create a temporary ID to test the connection
        const tempId = generateUUID();

        log.debug(`Connecting to ${serverUrl}...`);
        const connectionInfo = await caldavService.connect(
          tempId,
          serverUrl,
          username,
          effectivePassword,
          serverType,
        );

        // Check if this is a Vikunja server and warn the user
        const isVikunja = connectionInfo.calendarHome.includes('/dav/projects');
        if (isVikunja) {
          const proceed = await confirm({
            title: 'Vikunja server detected',
            message: (
              <div className="space-y-3">
                <p>
                  This appears to be a{' '}
                  <strong className="font-semibold text-surface-800 dark:text-surface-200">
                    Vikunja server
                  </strong>
                  .
                </p>
                <p>Vikunja has several CalDAV bugs that cause unpredictable behavior.</p>
                <p className="font-extrabold text-base text-surface-700 dark:text-surface-300">
                  ⚠️ This app may not work reliably with Vikunja and you may even encounter data
                  loss. ⚠️
                </p>
                <p className="font-bold text-surface-800 dark:text-surface-200">
                  It's recommend you try other CalDAV servers (like RustiCal, Fastmail, Baikal,
                  Radicale, etc.) instead.
                </p>
                <p>Do you want to continue anyway?</p>
              </div>
            ),
            confirmLabel: 'Continue (dangerous)',
            cancelLabel: 'Cancel',
            destructive: true,
            delayConfirmSeconds: 20,
          });

          if (!proceed) {
            // User cancelled, disconnect and return
            caldavService.disconnect(tempId);
            setIsLoading(false);
            return;
          }
        }

        log.debug(`Fetching calendars...`);
        const calendars = await caldavService.fetchCalendars(tempId);
        log.info(`Found ${calendars.length} calendars:`, calendars);

        // connection successful - now add the account with the same ID we used for connection
        createAccountMutation.mutate(
          {
            id: tempId, // use the same ID so the caldavService connection maps correctly
            name,
            serverUrl,
            username,
            password: effectivePassword,
            serverType,
          },
          {
            onSuccess: async (newAccount) => {
              // add the fetched calendars
              for (const calendar of calendars) {
                addCalendarMutation.mutate({ accountId: newAccount.id, calendarData: calendar });
              }

              // fetch tasks for each calendar
              log.debug('Fetching tasks for all calendars...');
              for (const calendar of calendars) {
                await fetchTasksForCalendar(newAccount.id, calendar);
              }

              // Invalidate task queries to refresh the UI
              queryClient.invalidateQueries({ queryKey: ['tasks'] });
              queryClient.invalidateQueries({ queryKey: ['tags'] });
            },
          },
        );
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to CalDAV server');
      log.error('Failed to connect:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop does not require keyboard handler; ESC key closes modal via useModalEscapeKey hook
    // biome-ignore lint/a11y/useKeyWithClickEvents: Modal backdrop is non-interactive; users close with Escape or X button
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={focusTrapRef}
        className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-md animate-scale-in"
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">
            {account ? 'Edit Account' : 'Add CalDAV Account'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label
              htmlFor="account-name"
              className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
            >
              Account Display Name
            </label>
            <ComposedInput
              ref={nameInputRef}
              id="account-name"
              type="text"
              value={name}
              onChange={setName}
              placeholder="My CalDAV Account"
              required
              className="w-full px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="server-type"
              className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
            >
              Server Type
            </label>
            <select
              id="server-type"
              value={serverType}
              onChange={(e) => setServerType(e.target.value as ServerType)}
              className="w-full px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
            >
              {SERVER_TYPE_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
              {getServerTypeDescription(serverType)}
            </p>
          </div>

          <div>
            <label
              htmlFor="server-url"
              className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
            >
              Server URL
            </label>
            <ComposedInput
              id="server-url"
              type="url"
              value={serverUrl}
              onChange={setServerUrl}
              placeholder="https://caldav.example.com"
              required
              disabled={!!getPredefinedServerUrl(serverType)}
              className="w-full px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-white dark:bg-surface-700 border border-transparent rounded-lg focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
            />
            {serverType === 'generic' && (
              <p className="mt-2 text-xs flex flex-row text-surface-500 dark:text-surface-400">
                <Info className="inline w-3.5 h-3.5 mr-1 text-surface-400" />
                The app will attempt to auto-discover for base URLs.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
            >
              Username
            </label>
            <ComposedInput
              id="username"
              type="text"
              value={username}
              onChange={setUsername}
              placeholder="user@example.com"
              required
              className="w-full px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
            >
              Password
            </label>
            <ComposedInput
              id="password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={account ? '(unchanged)' : 'Enter password'}
              required={!account}
              className="w-full px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isLoading ||
                !name.trim() ||
                !serverUrl.trim() ||
                !username.trim() ||
                (!account && !password.trim())
              }
              className="px-4 py-2 text-sm font-medium text-primary-contrast bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-inset"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {account ? 'Save' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
