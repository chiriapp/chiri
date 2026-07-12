import { emit } from '@tauri-apps/api/event';
import SnoozeIcon from 'lucide-react/icons/alarm-clock';
import CheckSquare from 'lucide-react/icons/check-square';
import Edit from 'lucide-react/icons/edit';
import { ModalWrapper } from '$components/ModalWrapper';
import { useSettingsStore } from '$context/settingsContext';
import { useTasks, useUpdateTask } from '$hooks/queries/useTasks';
import { useSetSelectedTask } from '$hooks/queries/useUIState';
import type { NotificationActionEvent } from '$types/notification';

interface TaskActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
}

export const TaskActionsModal = ({ isOpen, onClose, taskId }: TaskActionsModalProps) => {
  const { data: tasks = [] } = useTasks();
  const updateTaskMutation = useUpdateTask();
  const setSelectedTaskMutation = useSetSelectedTask();
  const { notificationActions } = useSettingsStore();

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
    // emit the same event that native snooze actions use
    const event: NotificationActionEvent = {
      action: `snooze-${notificationActions.snoozeDurationMinutes}min`,
      taskId: taskId,
      notificationType: 'overdue', // doesn't matter for snooze
    };
    await emit('notification-action', event);
    onClose();
  };

  return (
    <ModalWrapper
      onClose={onClose}
      title="Task Actions"
      description={task.title}
      size="md"
      zIndex="z-60"
    >
      <div className="flex flex-col gap-2">
        {notificationActions.complete && (
          <button
            type="button"
            onClick={handleComplete}
            disabled={task.completed}
            className="flex items-center gap-3 rounded-lg border border-surface-200 bg-surface-50 px-4 py-3 text-left font-medium text-sm text-surface-900 outline-hidden transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 dark:hover:bg-surface-700"
          >
            <CheckSquare className="h-5 w-5 text-semantic-success" />
            <div className="flex-1">
              <div className="font-semibold">Complete Task</div>
              <div className="text-surface-500 text-xs dark:text-surface-400">
                Mark this task as done
              </div>
            </div>
          </button>
        )}

        {notificationActions.view && (
          <button
            type="button"
            onClick={handleEdit}
            className="flex items-center gap-3 rounded-lg border border-surface-200 bg-surface-50 px-4 py-3 text-left font-medium text-sm text-surface-900 outline-hidden transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 dark:hover:bg-surface-700"
          >
            <Edit className="h-5 w-5 text-semantic-info" />
            <div className="flex-1">
              <div className="font-semibold">Edit Task</div>
              <div className="text-surface-500 text-xs dark:text-surface-400">
                Open the task editor
              </div>
            </div>
          </button>
        )}

        {notificationActions.snooze && (
          <button
            type="button"
            onClick={handleSnooze}
            className="flex items-center gap-3 rounded-lg border border-surface-200 bg-surface-50 px-4 py-3 text-left font-medium text-sm text-surface-900 outline-hidden transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 dark:hover:bg-surface-700"
          >
            <SnoozeIcon className="h-5 w-5 text-semantic-warning" />
            <div className="flex-1">
              <div className="font-semibold">Snooze</div>
              <div className="text-surface-500 text-xs dark:text-surface-400">
                Remind me again later
              </div>
            </div>
          </button>
        )}
      </div>
    </ModalWrapper>
  );
};
