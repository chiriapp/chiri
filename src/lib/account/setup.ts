import type { ConnectWithCertHandling } from '$lib/account/test';
import { CalDAVClient } from '$lib/caldav';
import { getSetupNotice, probeSetupVtodoCreationIfNeeded } from '$lib/caldav/setup';
import { db } from '$lib/database';
import { loggers } from '$lib/logger';
import { ensureTagExists } from '$lib/store/sync';
import { createTasks } from '$lib/store/tasks';
import type { AccountDraft } from '$types/account';
import type { Calendar } from '$types/calendar';
import { generateUUID } from '$utils/misc';

const log = loggers.account;

export const fetchTasksForCalendar = async (accountId: string, calendar: Calendar) => {
  try {
    const remoteTasks = await CalDAVClient.getForAccount(accountId).fetchTasks(calendar);

    if (!remoteTasks) {
      log.warn(`No tasks fetched from ${calendar.displayName}`);
      return;
    }

    log.info(`Fetched ${remoteTasks.length} tasks from ${calendar.displayName}`);

    const tasks = remoteTasks.map((remoteTask) => {
      const {
        caldavObject: _caldavObject,
        tagColorsByName: _tagColorsByName,
        ...remoteTaskData
      } = remoteTask;
      const categoryNames = remoteTask.categoryId
        ?.split(',')
        .map((value: string) => value.trim())
        .filter(Boolean);
      const tagIds = categoryNames?.map((name: string) => ensureTagExists(name));

      return {
        ...remoteTaskData,
        ...(tagIds ? { tags: tagIds } : {}),
      };
    });
    const taskObjects = remoteTasks.flatMap((remoteTask) =>
      remoteTask.caldavObject ? [remoteTask.caldavObject] : [],
    );

    await createTasks(tasks, { source: 'remote' });
    await db.upsertCalDAVTaskObjects(taskObjects, { notify: false });
  } catch (error) {
    log.error(`Failed to fetch tasks for calendar ${calendar.displayName}:`, error);
  }
};

interface DiscoverAccountCalendarsOptions {
  draft: AccountDraft;
  enforceVapid: boolean;
  effectivePassword: string;
  testSuccess: boolean;
  testConnectionId: string | null;
  testedCalendars: Calendar[];
  connectWithCertHandling: ConnectWithCertHandling;
  validateServerUrlScheme: () => boolean;
  validatePrincipalUrl: (baseUrl: string) => boolean;
  confirmServerWarning: (calendarHome?: string) => Promise<boolean>;
  confirmServerUrlWarning: (url: string) => Promise<boolean>;
}

export const discoverAccountCalendars = async ({
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
}: DiscoverAccountCalendarsOptions) => {
  if (!validateServerUrlScheme()) return null;

  const trimmedServerUrl = draft.serverUrl.trim();
  if (!validatePrincipalUrl(trimmedServerUrl)) return null;

  if (testSuccess && testConnectionId) {
    log.debug('Reusing tested connection...');
    return {
      testConnectionId,
      calendars: testedCalendars,
      serverUrl: trimmedServerUrl,
      notice: null,
    };
  }

  const probeConnectionId = generateUUID();
  log.debug(`Connecting to ${trimmedServerUrl}...`);
  const proceedWithUrl = await confirmServerUrlWarning(trimmedServerUrl);
  if (!proceedWithUrl) return null;

  const connectionInfo = await connectWithCertHandling(
    probeConnectionId,
    effectivePassword,
    trimmedServerUrl,
  );
  if (!connectionInfo) return null;

  const proceed = await confirmServerWarning(connectionInfo.calendarHome);
  if (!proceed) {
    CalDAVClient.disconnect(probeConnectionId);
    return null;
  }

  log.debug('Fetching calendars...');
  const client = CalDAVClient.getForAccount(probeConnectionId);
  const { calendars, diagnostics } = await client.discoverCalendars(enforceVapid);
  const canCreateVtodoCalendar = await probeSetupVtodoCreationIfNeeded(
    client,
    diagnostics,
    enforceVapid,
  );
  log.info(`Found ${calendars.length} calendars:`, calendars);

  return {
    testConnectionId: probeConnectionId,
    calendars,
    serverUrl: trimmedServerUrl,
    notice: getSetupNotice(diagnostics, canCreateVtodoCalendar),
  };
};
