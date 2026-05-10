import { emit } from '@tauri-apps/api/event';
import SnoozeIcon from 'lucide-react/icons/alarm-clock';
import CheckSquare from 'lucide-react/icons/check-square';
import Edit from 'lucide-react/icons/edit';
import X from 'lucide-react/icons/x';
import { ModalBackdrop } from '$components/ModalBackdrop';
import { useTasks, useUpdateTask } from '$hooks/queries/useTasks';
import { useSetSelectedTask } from '$hooks/queries/useUIState';
import { useFocusTrap } from '$hooks/ui/useFocusTrap';
import { useModalEscapeKey } from '$hooks/ui/useModalEscapeKey';
import type { NotificationActionEvent } from '$lib/notifications';

interface TaskActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
}

export const TaskActionsModal = ({ isOpen, onClose, taskId }: TaskActionsModalProps) => {
  const focusTrapRef = useFocusTrap();
  const { data: tasks = [] } = useTasks();
  const updateTaskMutation = useUpdateTask();
  const setSelectedTaskMutation = useSetSelectedTask();

  useModalEscapeKey(onClose);

  if (!isOpen || !taskId) return null;

  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const handleComplete = () => {
    updateTaskMutation.mutate({
      id: taskId,
      updates: { status: 'completed' as const, completed: true, completedAt: new Date() },
    });
    onClose();
  };

  const handleEdit = () => {
    setSelectedTaskMutation.mutate(taskId);
    onClose();
  };

  const handleSnooze = async () => {
    // Emit the same event that native snooze actions use
    const event: NotificationActionEvent = {
      action: 'snooze-15min',
      taskId: taskId,
      notificationType: 'overdue', // doesn't matter for snooze
    };
    await emit('notification-action', event);
    onClose();
  };

  return (
    <ModalBackdrop>
      <div
        className="relative flex w-full max-w-md flex-col gap-4 rounded-xl bg-white p-6 shadow-xl dark:bg-surface-800 animate-scale-in"
        ref={focusTrapRef}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
              Task Actions
            </h2>
            <p className="mt-1 text-sm text-surface-600 dark:text-surface-400 line-clamp-2">
              {task.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleComplete}
            disabled={task.completed}
            className="flex items-center gap-3 rounded-lg border border-surface-200 bg-surface-50 px-4 py-3 text-left text-sm font-medium text-surface-900 transition-colors hover:bg-surface-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 dark:hover:bg-surface-700 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <CheckSquare className="h-5 w-5 text-semantic-success" />
            <div className="flex-1">
              <div className="font-semibold">Complete Task</div>
              <div className="text-xs text-surface-500 dark:text-surface-400">
                Mark this task as done
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleEdit}
            className="flex items-center gap-3 rounded-lg border border-surface-200 bg-surface-50 px-4 py-3 text-left text-sm font-medium text-surface-900 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 dark:hover:bg-surface-700 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <Edit className="h-5 w-5 text-semantic-info" />
            <div className="flex-1">
              <div className="font-semibold">Edit Task</div>
              <div className="text-xs text-surface-500 dark:text-surface-400">
                Open the task editor
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleSnooze}
            className="flex items-center gap-3 rounded-lg border border-surface-200 bg-surface-50 px-4 py-3 text-left text-sm font-medium text-surface-900 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 dark:hover:bg-surface-700 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <SnoozeIcon className="h-5 w-5 text-semantic-warning" />
            <div className="flex-1">
              <div className="font-semibold">Snooze</div>
              <div className="text-xs text-surface-500 dark:text-surface-400">
                Remind me again later
              </div>
            </div>
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
};
