import { pluralize } from '$utils/misc';

interface ConnectionSuccessBannerProps {
  calendarCount: number;
}

export const ConnectionSuccessBanner = ({ calendarCount }: ConnectionSuccessBannerProps) => (
  <div className="p-3 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
    <div>
      <div className="font-medium">Connection verified!</div>
      {calendarCount > 0 && (
        <div className="text-xs mt-0.5">
          Found {calendarCount} {pluralize(calendarCount, 'calendar')}.
        </div>
      )}
    </div>
  </div>
);
