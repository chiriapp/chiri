import { Zap } from 'lucide-react';
import { pluralize } from '$utils/misc';

interface ConnectionSuccessBannerProps {
  calendarCount: number;
  pushSupportedCount?: number;
}

export const ConnectionSuccessBanner = ({
  calendarCount,
  pushSupportedCount = 0,
}: ConnectionSuccessBannerProps) => (
  <div className="p-3 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
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
);
