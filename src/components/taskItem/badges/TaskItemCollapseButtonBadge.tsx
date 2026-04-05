import ChevronDown from 'lucide-react/icons/chevron-down';
import ChevronRight from 'lucide-react/icons/chevron-right';
import { pluralize } from '$utils/misc';

export const TaskItemCollapseButtonBadge = ({
  isCollapsed,
  childCount,
  onToggleCollapsed,
}: {
  isCollapsed: boolean;
  childCount: number;
  onToggleCollapsed: (e: React.MouseEvent) => void;
}) => (
  <button
    type="button"
    onClick={onToggleCollapsed}
    className="collapse-button inline-flex items-center gap-0.5 px-2 py-0.5 rounded-sm border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors text-xs text-surface-500 dark:text-surface-400 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
  >
    {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
    <span>
      {childCount} {pluralize(childCount, 'subtask')}
    </span>
  </button>
);
