import Activity from 'lucide-react/icons/activity';
import Ban from 'lucide-react/icons/ban';
import Check from 'lucide-react/icons/check';
import Loader from 'lucide-react/icons/loader';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import { useState } from 'react';
import type { Task, TaskStatus } from '$types';

interface TaskEditorStatusProps {
  task: Task;
  onStatusChange: (status: TaskStatus) => void;
  onCommitPercent: (value: number) => void;
}

export const TaskEditorStatus = ({
  task,
  onStatusChange,
  onCommitPercent,
}: TaskEditorStatusProps) => {
  const [draftPercent, setDraftPercent] = useState<number | undefined>(undefined);

  return (
    <>
      <div>
        <div
          id="status-label"
          className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
        >
          <Activity className="w-4 h-4" />
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
                icon: Loader,
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
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500
                  ${isActive ? `${s.borderColor} ${s.bgColor} text-surface-900 dark:text-surface-100` : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-400'}
                `}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? s.color : ''}`} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label
          htmlFor="task-percent-complete"
          className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
        >
          <Loader className="w-4 h-4" />
          Progress ({draftPercent ?? task.percentComplete ?? 0}%)
        </label>
        <input
          id="task-percent-complete"
          type="range"
          min={0}
          max={100}
          step={5}
          value={draftPercent ?? task.percentComplete ?? 0}
          onChange={(e) => setDraftPercent(Number(e.target.value))}
          onPointerUp={(e) => {
            const value = Number((e.target as HTMLInputElement).value);
            setDraftPercent(undefined);
            onCommitPercent(value);
          }}
          onKeyUp={(e) => {
            const value = Number((e.target as HTMLInputElement).value);
            setDraftPercent(undefined);
            onCommitPercent(value);
          }}
          className="w-full accent-primary-500 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-surface-400 mt-1">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>
    </>
  );
};
