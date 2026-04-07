import Flag from 'lucide-react/icons/flag';
import { PRIORITIES } from '$constants/priority';
import { useUpdateTask } from '$hooks/queries/useTasks';
import type { Priority, Task } from '$types';

interface PriorityProps {
  task: Task;
}

export const TaskEditorPriority = ({ task }: PriorityProps) => {
  const updateTaskMutation = useUpdateTask();

  const handlePriorityChange = (priority: Priority) => {
    updateTaskMutation.mutate({ id: task.id, updates: { priority } });
  };

  return (
    <div>
      <div
        id="priority-label"
        className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
      >
        <Flag className="w-4 h-4" />
        Priority
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: fieldset would change semantic structure; div with role="group" is appropriate here */}
      <div className="flex gap-2" role="group" aria-labelledby="priority-label">
        {PRIORITIES.map((p) => (
          <button
            type="button"
            key={p.value}
            onClick={() => handlePriorityChange(p.value)}
            className={`
              flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500
              ${
                task.priority === p.value
                  ? `${p.borderColor} bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100`
                  : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-400'
              }
            `}
          >
            <span className={p.color}>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
