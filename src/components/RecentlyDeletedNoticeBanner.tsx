import Info from 'lucide-react/icons/info';
import { RECENTLY_DELETED_RETENTION_DAYS } from '$constants';
import { pluralize } from '$utils/misc';

export const RecentlyDeletedNoticeBanner = () => (
  <div className="flex items-start gap-2 rounded-lg border border-semantic-info/30 bg-semantic-info/10 px-3 py-2 text-sm text-surface-700 dark:text-surface-300">
    <Info className="mt-0.5 size-4 shrink-0 text-semantic-info" />
    <p>
      Tasks in Recently Deleted are permanently deleted after {RECENTLY_DELETED_RETENTION_DAYS}{' '}
      {pluralize(RECENTLY_DELETED_RETENTION_DAYS, 'day')}.
    </p>
  </div>
);
