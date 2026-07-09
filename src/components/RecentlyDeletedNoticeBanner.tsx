import Info from 'lucide-react/icons/info';
import { useSettingsStore } from '$context/settingsContext';
import { pluralize } from '$utils/misc';

export const RecentlyDeletedNoticeBanner = () => {
  const { autoEmptyRecentlyDeleted, recentlyDeletedRetentionDays } = useSettingsStore();

  return (
    <div className="flex items-start gap-2 rounded-lg border border-semantic-info/30 bg-semantic-info/10 px-3 py-2 text-sm text-surface-700 dark:text-surface-300">
      <Info className="mt-0.5 size-4 shrink-0 text-semantic-info" />
      <p>
        {autoEmptyRecentlyDeleted
          ? `Tasks in Recently Deleted are permanently deleted after ${recentlyDeletedRetentionDays} ${pluralize(recentlyDeletedRetentionDays, 'day')}.`
          : 'Tasks in Recently Deleted stay here until you restore or permanently delete them.'}
      </p>
    </div>
  );
};
