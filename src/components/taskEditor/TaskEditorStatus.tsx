import Activity from 'lucide-react/icons/activity';
import Check from 'lucide-react/icons/check';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import Timer from 'lucide-react/icons/timer';
import X from 'lucide-react/icons/x';
import type { Status, Task } from '$types/task/model';

interface TaskEditorStatusProps {
  task: Task;
  onStatusChange: (status: Status) => void;
  useAccentColorForCheckboxes: boolean;
  readOnly?: boolean;
}

export const TaskEditorStatus = ({
  task,
  onStatusChange,
  useAccentColorForCheckboxes,
  readOnly = false,
}: TaskEditorStatusProps) => {
  return (
    <div>
      <div
        id="status-label"
        className="mb-2 flex items-center gap-2 font-medium text-sm text-surface-600 dark:text-surface-400"
      >
        <Activity className="h-4 w-4" />
        Status
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: fieldset would change semantic structure; div with role="group" is appropriate here */}
      <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="status-label">
        {(
          [
            {
              value: 'needs-action',
              label: 'Needs Action',
              icon: RotateCcw,
              borderColor: 'border-status-needs-action',
              hoverBorderColor: 'hover:border-status-needs-action/70',
              bgColor: 'bg-status-needs-action/15',
            },
            {
              value: 'in-process',
              label: 'In Process',
              icon: Timer,
              borderColor: 'border-status-in-process',
              hoverBorderColor: 'hover:border-status-in-process/70',
              bgColor: 'bg-status-in-process/15',
            },
            {
              value: 'completed',
              label: 'Completed',
              icon: Check,
              borderColor: 'border-status-completed',
              hoverBorderColor: 'hover:border-status-completed/70',
              bgColor: 'bg-status-completed/15',
            },
            {
              value: 'cancelled',
              label: 'Cancelled',
              icon: X,
              borderColor: 'border-status-cancelled',
              hoverBorderColor: 'hover:border-status-cancelled/70',
              bgColor: 'bg-status-cancelled/15',
            },
          ] as const
        ).map((s) => {
          const Icon = s.icon;
          const isActive = task.status === s.value;
          const activeClass =
            s.value === 'completed' && useAccentColorForCheckboxes
              ? 'border-primary-ink bg-primary-500/15 text-surface-900 dark:text-surface-100'
              : `${s.borderColor} ${s.bgColor} text-surface-900 dark:text-surface-100`;
          const hoverBorderColor =
            s.value === 'completed' && useAccentColorForCheckboxes
              ? 'hover:border-primary-ink/70'
              : s.hoverBorderColor;
          const inactiveClass = `border-surface-200 text-surface-600 dark:border-surface-700 dark:text-surface-400 ${readOnly ? 'opacity-60' : `${hoverBorderColor} hover:bg-surface-50 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-300`}`;
          return (
            <button
              type="button"
              key={s.value}
              onClick={() => onStatusChange(s.value)}
              disabled={readOnly}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-medium text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset ${readOnly ? 'disabled:cursor-not-allowed' : ''} ${isActive ? activeClass : inactiveClass}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
