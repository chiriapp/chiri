import ChevronRight from 'lucide-react/icons/chevron-right';
import Clock from 'lucide-react/icons/clock';
import Tag from 'lucide-react/icons/tag';
import type { TaskListDensity } from '$types/settings';

interface TaskListDensityPreviewProps {
  density: TaskListDensity;
}

const previewBadgeClass =
  'inline-flex items-center gap-1 rounded-sm border border-surface-200 bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-600 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-300 shrink-0';

const renderPreviewBadges = () => (
  <>
    <span className={previewBadgeClass}>
      <Clock className="h-3 w-3 text-primary-500" aria-hidden="true" />
      Today
    </span>
    <span className={previewBadgeClass}>
      <Tag className="h-3 w-3 text-primary-500" aria-hidden="true" />
      Home
    </span>
  </>
);

export const TaskListDensityPreview = ({ density }: TaskListDensityPreviewProps) => {
  const isCompact = density === 'compact';

  return (
    <div className="mt-4 rounded-lg bg-surface-50 p-3 dark:bg-surface-900/30" aria-hidden="true">
      <div
        className={`flex items-start gap-3 rounded-lg border border-surface-200 bg-white pr-3 pl-3 shadow-xs dark:border-surface-700 dark:bg-surface-800 ${
          isCompact ? 'py-2' : 'py-3'
        }`}
      >
        <span className="mt-0.5 flex h-5 w-5 shrink-0 rounded-sm border-2 border-surface-300 dark:border-surface-600" />

        <div className="min-w-0 flex-1">
          {isCompact ? (
            <div className="flex min-w-0 items-center gap-2 overflow-hidden">
              <span className="min-w-0 shrink truncate font-medium text-sm text-surface-800 dark:text-surface-200">
                Plan weekend errands
              </span>
              <span className="flex shrink-0 items-center gap-2 overflow-hidden">
                {renderPreviewBadges()}
              </span>
            </div>
          ) : (
            <>
              <div className="truncate font-medium text-sm text-surface-800 leading-5 dark:text-surface-200">
                Plan weekend errands
              </div>
              <div className="mt-1 truncate text-surface-500 text-xs dark:text-surface-400">
                Groceries, pharmacy, and library pickup
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">{renderPreviewBadges()}</div>
            </>
          )}
        </div>

        <ChevronRight className="h-5 w-5 shrink-0 text-surface-300 dark:text-surface-600" />
      </div>
    </div>
  );
};
