import ChevronDown from 'lucide-react/icons/chevron-down';
import ChevronRight from 'lucide-react/icons/chevron-right';
import type { MouseEvent } from 'react';
import { pluralize } from '$utils/misc';

export const TaskItemCollapseButtonBadge = ({
  isCollapsed,
  childCount,
  onToggleCollapsed,
}: {
  isCollapsed: boolean;
  childCount: number;
  onToggleCollapsed: (e: MouseEvent) => void;
}) => (
  <button
    type="button"
    onClick={onToggleCollapsed}
    className="collapse-button inline-flex items-center gap-0.5 rounded-sm border border-surface-200 bg-surface-50 px-2 py-0.5 text-surface-500 text-xs outline-hidden transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:border-surface-600 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700"
  >
    {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
    <span>
      {childCount} {pluralize(childCount, 'subtask')}
    </span>
  </button>
);
