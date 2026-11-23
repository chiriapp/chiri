import CheckCheck from 'lucide-react/icons/check-check';
import ChevronDown from 'lucide-react/icons/chevron-down';
import ChevronRight from 'lucide-react/icons/chevron-right';
import type { MouseEvent } from 'react';
import { TaskItemBadge } from '$components/taskItem/badges/TaskItemBadge';
import { pluralize } from '$utils/misc';

export const TaskItemSubtaskBadge = ({
  completed,
  total,
  isCollapsed,
  onToggleCollapsed,
}: {
  completed: number;
  total: number;
  isCollapsed: boolean;
  onToggleCollapsed: (e: MouseEvent) => void;
}) => (
  <TaskItemBadge
    className="gap-0.5"
    onClick={onToggleCollapsed}
    ariaLabel={isCollapsed ? 'Expand subtasks' : 'Collapse subtasks'}
    tooltip={`${completed} of ${total} ${pluralize(total, 'subtask')} complete, click to ${isCollapsed ? 'expand' : 'collapse'}`}
  >
    <CheckCheck className="h-3 w-3" />
    <span>
      {completed}/{total}
    </span>
    {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
  </TaskItemBadge>
);
