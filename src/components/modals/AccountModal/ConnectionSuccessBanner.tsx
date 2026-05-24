import { Zap } from 'lucide-react';
import AlertTriangle from 'lucide-react/icons/triangle-alert';
import { pluralize } from '$utils/misc';

interface ConnectionNotice {
  title: string;
  message: string;
}

interface ConnectionSuccessBannerProps {
  calendarCount: number;
  pushSupportedCount?: number;
  notice?: ConnectionNotice | null;
}

export const ConnectionSuccessBanner = ({
  calendarCount,
  pushSupportedCount = 0,
  notice,
}: ConnectionSuccessBannerProps) => (
  <div className="space-y-2">
    <div className="p-3 text-sm text-semantic-success bg-semantic-success/10 border border-semantic-success/30 rounded-lg">
      <div className="font-medium">Connection verified!</div>
      {calendarCount > 0 && (
        <div className="text-xs mt-0.5">
          Found {calendarCount} {pluralize(calendarCount, 'calendar')}.
        </div>
      )}

      {pushSupportedCount > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
          <Zap className="size-3 fill-current" />
          WebDAV Push supported — real-time sync available
        </div>
      )}
    </div>

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
