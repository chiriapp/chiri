import CheckCircle from 'lucide-react/icons/check-circle';
import CircleX from 'lucide-react/icons/circle-x';
import AlertTriangle from 'lucide-react/icons/triangle-alert';
import X from 'lucide-react/icons/x';
import Zap from 'lucide-react/icons/zap';
import { useSettingsStore } from '$context/settingsContext';
import type { CalDAVSetupError, CalDAVSetupNotice } from '$lib/caldav/setup';
import { pluralize } from '$utils/misc';

interface ConnectionNoticeBannerProps {
  success: boolean;
  error: CalDAVSetupError | null;
  notice: CalDAVSetupNotice | null;
  calendarCount: number;
  pushSupported?: boolean;
  onDismiss?: () => void;
}

export const ConnectionNoticeBanner = ({
  success,
  error,
  notice,
  calendarCount,
  pushSupported,
  onDismiss,
}: ConnectionNoticeBannerProps) => {
  const { enablePush } = useSettingsStore();

  if (success) {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2 rounded-lg border border-semantic-success/30 bg-semantic-success/10 p-3 text-sm text-surface-700 dark:text-surface-300">
          <CheckCircle className="mt-0.5 size-4 shrink-0 text-semantic-success" />
          <span className="min-w-0 flex-1">
            Connected successfully. Found {calendarCount}{' '}
            {pluralize(calendarCount, 'calendar', 'calendars')}.
          </span>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss connection test message"
              className="-m-1 self-center rounded-sm p-1 text-semantic-success outline-hidden transition-colors hover:bg-semantic-success/10 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {enablePush && pushSupported !== undefined && (
          <div className="flex items-start gap-2 rounded-lg border border-semantic-info/30 bg-semantic-info/10 p-3 text-sm text-surface-700 dark:text-surface-300">
            <Zap className="mt-0.5 size-4 shrink-0 text-semantic-info" />
            <span>
              {pushSupported
                ? 'WebDAV Push supported, real-time sync available.'
                : 'WebDAV Push not supported, real-time sync unavailable.'}
            </span>
          </div>
        )}

        {notice && (
          <div className="flex gap-2 rounded-lg border border-semantic-warning/30 bg-semantic-warning/10 p-3 text-sm text-surface-700 dark:text-surface-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-semantic-warning" />
            <div className="min-w-0 space-y-1">
              <p className="font-medium text-semantic-warning">{notice.title}</p>
              <p className="text-xs">{notice.message}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-semantic-error/30 bg-semantic-error/10 p-3 text-sm text-surface-700 dark:text-surface-300">
        <div className="grid min-w-0 flex-1 grid-cols-[1rem_minmax(0,1fr)] gap-x-2 gap-y-2">
          <CircleX className="mt-0.5 size-4 shrink-0 text-semantic-error" />
          <div className="min-w-0">
            <p className="wrap-break-word font-medium text-semantic-error">{error.title}</p>
          </div>
          <p className="wrap-break-word col-span-2 min-w-0">{error.message}</p>

          {error.hint && (
            <p className="wrap-break-word col-span-2 min-w-0 text-surface-600 text-xs dark:text-surface-400">
              {error.hint}
            </p>
          )}

          {error.detail && error.detail !== error.message && (
            <details className="col-span-2 min-w-0 text-surface-500 text-xs dark:text-surface-400">
              <summary className="cursor-pointer select-none font-medium">Technical detail</summary>
              <p className="wrap-break-word mt-1 whitespace-pre-wrap font-mono">{error.detail}</p>
            </details>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss connection test message"
            className="-m-1 self-start rounded-sm p-1 text-semantic-error outline-hidden transition-colors hover:bg-semantic-error/10 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return null;
};
