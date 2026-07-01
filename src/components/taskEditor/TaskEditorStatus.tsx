import Activity from 'lucide-react/icons/activity';
import Ban from 'lucide-react/icons/ban';
import Check from 'lucide-react/icons/check';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import Timer from 'lucide-react/icons/timer';
import { type CSSProperties, useState } from 'react';
import type { Task, TaskStatus } from '$types';

interface TaskEditorStatusProps {
  task: Task;
  onStatusChange: (status: TaskStatus) => void;
  onCommitPercent: (value: number) => void;
  readOnly?: boolean;
}

export const TaskEditorStatus = ({
  task,
  onStatusChange,
  onCommitPercent,
  readOnly = false,
}: TaskEditorStatusProps) => {
  const [draftPercent, setDraftPercent] = useState<number | undefined>(undefined);

  return (
    <>
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
                color: 'text-status-needs-action',
                borderColor: 'border-status-needs-action',
                bgColor: 'bg-surface-200 dark:bg-surface-700',
              },
              {
                value: 'in-process',
                label: 'In Process',
                icon: Timer,
                color: 'text-status-in-process',
                borderColor: 'border-status-in-process',
                bgColor: 'bg-surface-200 dark:bg-surface-700',
              },
              {
                value: 'completed',
                label: 'Completed',
                icon: Check,
                color: 'text-status-completed',
                borderColor: 'border-status-completed',
                bgColor: 'bg-surface-200 dark:bg-surface-700',
              },
              {
                value: 'cancelled',
                label: 'Cancelled',
                icon: Ban,
                color: 'text-status-cancelled',
                borderColor: 'border-status-cancelled',
                bgColor: 'bg-surface-200 dark:bg-surface-700',
              },
            ] as const
          ).map((s) => {
            const Icon = s.icon;
            const isActive = task.status === s.value;
            return (
              <button
                type="button"
                key={s.value}
                onClick={() => onStatusChange(s.value)}
                disabled={readOnly}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-medium text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${readOnly ? 'disabled:cursor-not-allowed' : ''}
                  ${isActive ? `${s.borderColor} ${s.bgColor} text-surface-900 dark:text-surface-100` : `border-surface-200 text-surface-600 dark:border-surface-700 dark:text-surface-400 ${readOnly ? '' : 'hover:border-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800'}`}
                `}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? s.color : ''}`} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label
          htmlFor="task-percent-complete"
          className="mb-1 flex items-center gap-2 font-medium text-sm text-surface-600 dark:text-surface-400"
        >
          <Timer className="h-4 w-4" />
          Progress ({draftPercent ?? task.percentComplete ?? 0}%)
        </label>
        <div className={readOnly ? 'cursor-not-allowed' : undefined}>
          <input
            id="task-percent-complete"
            type="range"
            min={0}
            max={100}
            step={5}
            value={draftPercent ?? task.percentComplete ?? 0}
            style={{ '--pct': `${draftPercent ?? task.percentComplete ?? 0}%` } as CSSProperties}
            onChange={(e) => setDraftPercent(Number(e.target.value))}
            onPointerUp={(e) => {
              if (readOnly) return;
              const value = Number((e.target as HTMLInputElement).value);
              setDraftPercent(undefined);
              onCommitPercent(value);
            }}
            onKeyUp={(e) => {
              if (readOnly) return;
              const value = Number((e.target as HTMLInputElement).value);
              setDraftPercent(undefined);
              onCommitPercent(value);
            }}
            disabled={readOnly}
            className={`w-full ${readOnly ? 'pointer-events-none' : ''}`}
          />
        </div>
        <div className="mt-1 flex justify-between text-surface-400 text-xs">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>
    </>
  );
};
