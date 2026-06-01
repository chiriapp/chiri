import { AppSelect } from '$components/AppSelect';
import { useSettingsStore } from '$context/settingsContext';
import { useAccounts } from '$hooks/queries/useAccounts';
import { DEFAULT_NTFY_SERVER_URL } from '$lib/push/ntfyProvider';
import {
  LINUX_UNIFIED_PUSH_PROVIDER_ID,
  NTFY_DIRECT_PROVIDER_ID,
  type PushProviderId,
} from '$types/push';
import { pluralize } from '$utils/misc';
import { isLinuxPlatform } from '$utils/platform';

export const WebDAVPushSettings = () => {
  const { data: accounts = [] } = useAccounts();
  const {
    enablePush,
    setEnablePush,
    pushProvider,
    setPushProvider,
    ntfyServerUrl,
    setNtfyServerUrl,
  } = useSettingsStore();
  const showLinuxUnifiedPushOption =
    isLinuxPlatform() || pushProvider === LINUX_UNIFIED_PUSH_PROVIDER_ID;
  const showPushProviderSelect = showLinuxUnifiedPushOption;
  const caldavAccounts = accounts.filter((account) => account.caldav);
  const webdavPushAccountCount = caldavAccounts.filter((account) =>
    account.calendars.some((calendar) => calendar.pushSupported),
  ).length;
  const webdavPushAvailability =
    caldavAccounts.length === 0
      ? 'No CalDAV accounts connected.'
      : webdavPushAccountCount === 0
        ? 'No connected CalDAV accounts advertise WebDAV Push.'
        : `Available for ${webdavPushAccountCount} of ${caldavAccounts.length} ${pluralize(
            caldavAccounts.length,
            'CalDAV account',
            'CalDAV accounts',
          )}.`;

  return (
    <>
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">
        WebDAV Push
      </h3>
      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Enable WebDAV Push (experimental)
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Use WebDAV Push when a CalDAV server supports it
            </p>
          </div>
          <input
            type="checkbox"
            checked={enablePush}
            onChange={(e) => setEnablePush(e.target.checked)}
            className="rounded border-surface-300 dark:border-surface-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-none"
          />
        </label>

        {enablePush && (
          <>
            <div className="border-t border-surface-200 dark:border-surface-700" />

            <div className="p-4">
              <p className="text-sm text-surface-700 dark:text-surface-300">Availability</p>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                {webdavPushAvailability}
              </p>
            </div>

            {showPushProviderSelect && (
              <>
                <div className="border-t border-surface-200 dark:border-surface-700" />

                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm text-surface-700 dark:text-surface-300">
                      Receive push messages via
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">
                      Local receiver for Web Push callbacks
                    </p>
                  </div>
                  <AppSelect
                    value={pushProvider}
                    onChange={(e) => setPushProvider(e.target.value as PushProviderId)}
                    className="text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors shrink-0"
                  >
                    <option value={NTFY_DIRECT_PROVIDER_ID}>ntfy</option>
                    {showLinuxUnifiedPushOption && (
                      <option value={LINUX_UNIFIED_PUSH_PROVIDER_ID}>Linux UnifiedPush</option>
                    )}
                  </AppSelect>
                </div>
              </>
            )}

            {pushProvider === NTFY_DIRECT_PROVIDER_ID && (
              <>
                <div className="border-t border-surface-200 dark:border-surface-700" />

                <div className="p-4 space-y-2">
                  <div>
                    <p className="text-sm text-surface-700 dark:text-surface-300">ntfy server</p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">
                      Leave blank to use ntfy.sh
                    </p>
                  </div>
                  <input
                    type="url"
                    value={ntfyServerUrl}
                    onChange={(e) => setNtfyServerUrl(e.target.value)}
                    placeholder={DEFAULT_NTFY_SERVER_URL}
                    className="w-full text-sm px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-700 text-surface-800 dark:text-surface-200 outline-none focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};
