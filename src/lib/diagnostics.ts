import {
  getBundleType,
  getIdentifier,
  getName,
  getTauriVersion,
  getVersion,
} from '@tauri-apps/api/app';
import { appConfigDir, appLocalDataDir, appLogDir, join } from '@tauri-apps/api/path';
import { readDir, readTextFile } from '@tauri-apps/plugin-fs';
import { isPermissionGranted } from '@tauri-apps/plugin-notification';
import {
  arch,
  exeExtension,
  family,
  locale,
  version as osVersion,
  platform,
  type,
} from '@tauri-apps/plugin-os';
import { settingsStore } from '$context/settingsContext';
import { dataStore } from '$lib/store';
import type { Account, InstallType } from '$types';
import {
  getInstallType,
  getPackageManagerName,
  isMacPlatform,
  shouldDisableUpdates,
} from '$utils/platform';

interface DiagnosticsMetadata {
  app: {
    name: string | null;
    version: string | null;
    identifier: string | null;
    bundleType: string | null;
    tauriVersion: string | null;
  };
  installation: {
    type: InstallType | null;
    source: string | null;
    updatesManagedExternally: boolean | null;
  };
  platform: {
    platform: string;
    type: string;
    family: string;
    arch: string;
    version: string;
    locale: string | null;
    exeExtension: string;
  };
}

interface DiagnosticsDataSummary {
  initialized: boolean;
  counts: {
    accounts: number;
    activeAccounts: number;
    calendars: number;
    calendarsWithVtodoSupport: number;
    calendarsWithPushSupport: number;
    tasks: number;
    activeTasks: number;
    completedTasks: number;
    deletedTasks: number;
    unsyncedTasks: number;
    localOnlyTasks: number;
    recurringTasks: number;
    tasksWithReminders: number;
    pendingDeletions: number;
    pendingDeletionErrors: number;
    tags: number;
    savedFilters: number;
  };
  accounts: Array<{
    id: string;
    name: string;
    active: boolean;
    serverType: string | null;
    serverHost: string | null;
    authType: string | null;
    acceptInvalidCerts: boolean;
    hasCalendarHomeUrl: boolean;
    hasPrincipalUrl: boolean;
    lastSync: string | null;
    calendarCount: number;
    taskCount: number;
    unsyncedTaskCount: number;
    calendars: Array<{
      id: string;
      name: string;
      host: string | null;
      supportedComponents: string[];
      pushSupported: boolean | null;
      hasSyncToken: boolean;
      taskCount: number;
      unsyncedTaskCount: number;
    }>;
  }>;
  sync: {
    autoSync: boolean;
    syncInterval: number;
    syncOnStartup: boolean;
    syncOnReconnect: boolean;
    pendingDeletionCount: number;
    pendingDeletionErrorCount: number;
  };
  push: {
    enabled: boolean;
    provider: string;
    ntfyServerHost: string | null;
    mozillaAutopushWebsocketHost: string | null;
    mozillaAutopushEndpointHost: string | null;
    calendarsWithPushSupport: number;
    calendarsWithPushTopic: number;
  };
  notifications: {
    enabled: boolean;
    reminders: boolean;
    overdue: boolean;
    quietHoursEnabled: boolean;
  };
}

interface DiagnosticsSyncHealth {
  accountsNeverSynced: number;
  oldestAccountSync: string | null;
  newestAccountSync: string | null;
  calendarsWithCtag: number;
  calendarsWithSyncToken: number;
  pendingDeletionMaxAttemptCount: number;
  pendingDeletionLastAttemptAt: string | null;
  pendingDeletionLastError: string | null;
}

interface DiagnosticsPermissionProbes {
  logDirectoryReadable: boolean;
  logFilesReadable: boolean;
  databaseDirectoryReadable: boolean;
  notificationPermissionGranted: boolean | null;
  clipboardWriteApiAvailable: boolean;
}

export interface AppDiagnosticsReport {
  createdAt: string;
  metadata: DiagnosticsMetadata;
  summary: DiagnosticsDataSummary;
  syncHealth: DiagnosticsSyncHealth;
  permissionProbes: DiagnosticsPermissionProbes;
  databaseDirectory: string;
  logDirectory: string;
  settings: unknown;
}

export interface LogExport {
  createdAt: string;
  files: Array<{
    path: string;
    contents: string;
  }>;
}

export const getDatabaseDirectory = async () =>
  isMacPlatform() ? appLocalDataDir() : appConfigDir();

const resolveMetadataField = async <T>(read: () => Promise<T>): Promise<T | null> => {
  try {
    return await read();
  } catch {
    return null;
  }
};

const createDiagnosticsMetadata = async (): Promise<DiagnosticsMetadata> => {
  const installType = await resolveMetadataField(getInstallType);

  return {
    app: {
      name: await resolveMetadataField(getName),
      version: await resolveMetadataField(getVersion),
      identifier: await resolveMetadataField(getIdentifier),
      bundleType: await resolveMetadataField(getBundleType),
      tauriVersion: await resolveMetadataField(getTauriVersion),
    },
    installation: {
      type: installType,
      source: installType ? getPackageManagerName(installType) : null,
      updatesManagedExternally: await resolveMetadataField(shouldDisableUpdates),
    },
    platform: {
      platform: platform(),
      type: type(),
      family: family(),
      arch: arch(),
      version: osVersion(),
      locale: await resolveMetadataField(locale),
      exeExtension: exeExtension(),
    },
  };
};

const getHostname = (rawUrl: string | undefined | null) => {
  if (!rawUrl) return null;

  try {
    return new URL(rawUrl).hostname;
  } catch {
    return null;
  }
};

const redactDiagnosticsText = (text: string) =>
  text
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]');

const getAccountServerHost = (account: Account) => getHostname(account.caldav?.serverUrl);

const createDataSummary = (): DiagnosticsDataSummary => {
  const data = dataStore.load();
  const settings = settingsStore.getState();
  const calendars = data.accounts.flatMap((account) => account.calendars);
  const activeTasks = data.tasks.filter((task) => !task.deletedAt);
  const pendingDeletionErrors = data.pendingDeletions.filter((deletion) => deletion.lastError);

  return {
    initialized: dataStore.getIsInitialized(),
    counts: {
      accounts: data.accounts.length,
      activeAccounts: data.accounts.filter((account) => account.isActive).length,
      calendars: calendars.length,
      calendarsWithVtodoSupport: calendars.filter((calendar) =>
        calendar.supportedComponents?.includes('VTODO'),
      ).length,
      calendarsWithPushSupport: calendars.filter((calendar) => calendar.pushSupported).length,
      tasks: data.tasks.length,
      activeTasks: activeTasks.length,
      completedTasks: data.tasks.filter((task) => task.completed).length,
      deletedTasks: data.tasks.filter((task) => task.deletedAt).length,
      unsyncedTasks: data.tasks.filter((task) => !task.synced).length,
      localOnlyTasks: data.tasks.filter((task) => task.localOnly).length,
      recurringTasks: data.tasks.filter((task) => task.rrule).length,
      tasksWithReminders: data.tasks.filter((task) => (task.reminders?.length ?? 0) > 0).length,
      pendingDeletions: data.pendingDeletions.length,
      pendingDeletionErrors: pendingDeletionErrors.length,
      tags: data.tags.length,
      savedFilters: data.filters.length,
    },
    accounts: data.accounts.map((account) => {
      const accountTasks = data.tasks.filter((task) => task.accountId === account.id);
      return {
        id: account.id,
        name: account.name,
        active: account.isActive,
        serverType: account.caldav?.serverType ?? null,
        serverHost: getAccountServerHost(account),
        authType: account.caldav?.authType ?? null,
        acceptInvalidCerts: account.caldav?.acceptInvalidCerts ?? false,
        hasCalendarHomeUrl: Boolean(account.caldav?.calendarHomeUrl),
        hasPrincipalUrl: Boolean(account.caldav?.principalUrl),
        lastSync: account.lastSync?.toISOString() ?? null,
        calendarCount: account.calendars.length,
        taskCount: accountTasks.length,
        unsyncedTaskCount: accountTasks.filter((task) => !task.synced).length,
        calendars: account.calendars.map((calendar) => {
          const calendarTasks = data.tasks.filter((task) => task.calendarId === calendar.id);
          return {
            id: calendar.id,
            name: calendar.displayName,
            host: getHostname(calendar.url),
            supportedComponents: calendar.supportedComponents ?? [],
            pushSupported: calendar.pushSupported ?? null,
            hasSyncToken: Boolean(calendar.syncToken),
            taskCount: calendarTasks.length,
            unsyncedTaskCount: calendarTasks.filter((task) => !task.synced).length,
          };
        }),
      };
    }),
    sync: {
      autoSync: settings.autoSync,
      syncInterval: settings.syncInterval,
      syncOnStartup: settings.syncOnStartup,
      syncOnReconnect: settings.syncOnReconnect,
      pendingDeletionCount: data.pendingDeletions.length,
      pendingDeletionErrorCount: pendingDeletionErrors.length,
    },
    push: {
      enabled: settings.enablePush,
      provider: settings.pushProvider,
      ntfyServerHost: getHostname(settings.ntfyServerUrl),
      mozillaAutopushWebsocketHost: getHostname(settings.mozillaAutopushWebsocketUrl),
      mozillaAutopushEndpointHost: getHostname(settings.mozillaAutopushEndpointUrl),
      calendarsWithPushSupport: calendars.filter((calendar) => calendar.pushSupported).length,
      calendarsWithPushTopic: calendars.filter((calendar) => calendar.pushTopic).length,
    },
    notifications: {
      enabled: settings.notifications,
      reminders: settings.notifyReminders,
      overdue: settings.notifyOverdue,
      quietHoursEnabled: settings.quietHoursEnabled,
    },
  };
};

const createSyncHealth = (): DiagnosticsSyncHealth => {
  const data = dataStore.load();
  const calendars = data.accounts.flatMap((account) => account.calendars);
  const syncDates = data.accounts
    .map((account) => account.lastSync)
    .filter((date): date is Date => Boolean(date))
    .map((date) => date.getTime());
  const pendingDeletionAttempts = data.pendingDeletions.map(
    (deletion) => deletion.attemptCount ?? 0,
  );
  const pendingDeletionLastAttempt = data.pendingDeletions
    .map((deletion) => deletion.lastAttemptAt)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const pendingDeletionLastError = data.pendingDeletions
    .filter((deletion) => deletion.lastError)
    .sort(
      (a, b) => (b.lastAttemptAt?.getTime() ?? 0) - (a.lastAttemptAt?.getTime() ?? 0),
    )[0]?.lastError;

  return {
    accountsNeverSynced: data.accounts.filter((account) => !account.lastSync).length,
    oldestAccountSync: syncDates.length > 0 ? new Date(Math.min(...syncDates)).toISOString() : null,
    newestAccountSync: syncDates.length > 0 ? new Date(Math.max(...syncDates)).toISOString() : null,
    calendarsWithCtag: calendars.filter((calendar) => calendar.ctag).length,
    calendarsWithSyncToken: calendars.filter((calendar) => calendar.syncToken).length,
    pendingDeletionMaxAttemptCount:
      pendingDeletionAttempts.length > 0 ? Math.max(...pendingDeletionAttempts) : 0,
    pendingDeletionLastAttemptAt: pendingDeletionLastAttempt?.toISOString() ?? null,
    pendingDeletionLastError: pendingDeletionLastError
      ? redactDiagnosticsText(pendingDeletionLastError)
      : null,
  };
};

const probe = async (check: () => Promise<unknown>) => {
  try {
    await check();
    return true;
  } catch {
    return false;
  }
};

const createPermissionProbes = async (): Promise<DiagnosticsPermissionProbes> => {
  const logDirectory = await appLogDir();
  const databaseDirectory = await getDatabaseDirectory();
  const logFilePaths = await getLogFilePaths(logDirectory).catch(() => []);

  return {
    logDirectoryReadable: await probe(() => readDir(logDirectory)),
    logFilesReadable:
      logFilePaths.length === 0 ? true : await probe(() => readTextFile(logFilePaths[0])),
    databaseDirectoryReadable: await probe(() => readDir(databaseDirectory)),
    notificationPermissionGranted: await resolveMetadataField(isPermissionGranted),
    clipboardWriteApiAvailable: typeof navigator.clipboard?.writeText === 'function',
  };
};

const getLogFilePaths = async (path: string): Promise<string[]> => {
  const entries = await readDir(path);
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = await join(path, entry.name);
      if (entry.isDirectory) return getLogFilePaths(entryPath);
      return entry.isFile ? [entryPath] : [];
    }),
  );

  return paths.flat();
};

export const createDiagnosticsReport = async (
  settingsJson: string,
): Promise<AppDiagnosticsReport> => ({
  createdAt: new Date().toISOString(),
  metadata: await createDiagnosticsMetadata(),
  summary: createDataSummary(),
  syncHealth: createSyncHealth(),
  permissionProbes: await createPermissionProbes(),
  databaseDirectory: await getDatabaseDirectory(),
  logDirectory: await appLogDir(),
  settings: JSON.parse(settingsJson),
});

export const createLogExport = async (): Promise<LogExport> => {
  const logPath = await appLogDir();
  const files = await Promise.all(
    (await getLogFilePaths(logPath)).map(async (path) => {
      return {
        path,
        contents: await readTextFile(path),
      };
    }),
  );

  return {
    createdAt: new Date().toISOString(),
    files,
  };
};
