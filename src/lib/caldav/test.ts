import { connectionStore } from '$context/connectionContext';
import { CalDAVClient } from '$lib/caldav';
import type { CalendarDiscoveryDiagnostics } from '$lib/caldav/calendars';
import { getSetupNotice, probeSetupVtodoCreationIfNeeded } from '$lib/caldav/setup';
import type { HttpRequestContext } from '$lib/http';
import type { Account } from '$types/account';

export interface AccountConnectionTestResult {
  calendars: Awaited<ReturnType<CalDAVClient['discoverCalendars']>>['calendars'];
  diagnostics: CalendarDiscoveryDiagnostics;
  notice: ReturnType<typeof getSetupNotice>;
}

export const testAccountConnection = async (
  account: Account,
  enforceVapid: boolean,
  context?: HttpRequestContext,
): Promise<AccountConnectionTestResult> => {
  if (!connectionStore.beginTesting(account.id, context?.operationId)) {
    throw new Error('A connection test is already in progress for this account.');
  }

  const testConnectionId = `connection-test-${crypto.randomUUID()}`;

  try {
    await CalDAVClient.reconnect(account, context, testConnectionId);
    const client = CalDAVClient.getForAccount(testConnectionId);
    const { calendars, diagnostics } = await client.discoverCalendars(enforceVapid, context);
    const canCreateVtodoCalendar = await probeSetupVtodoCreationIfNeeded(
      client,
      diagnostics,
      enforceVapid,
      context,
    );

    return {
      calendars,
      diagnostics,
      notice: getSetupNotice(diagnostics, canCreateVtodoCalendar),
    };
  } finally {
    CalDAVClient.disconnect(testConnectionId);
    connectionStore.endTesting(account.id, context?.operationId);
  }
};
