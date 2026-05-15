import { ModalWrapper } from '$components/ModalWrapper';
import { TaskHistoryEntry } from '$components/modals/TaskHistoryEntry';
import { useTaskHistory } from '$hooks/queries/useTaskHistory';
import { useSettingsStore } from '$hooks/store/useSettingsStore';

interface TaskHistoryModalProps {
  isOpen: boolean;
  taskTitle: string;
  taskUid: string;
  onClose: () => void;
}

export const TaskHistoryModal = ({
  isOpen,
  taskTitle,
  taskUid,
  onClose,
}: TaskHistoryModalProps) => {
  const { data: history, isLoading } = useTaskHistory(taskUid);
  const { timeFormat } = useSettingsStore();

  if (!isOpen) return null;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="History"
      description={taskTitle}
      zIndex="z-60"
      className="max-w-md max-h-[80vh]"
    >
      {isLoading ? (
        <p className="text-sm text-surface-400 dark:text-surface-500">Loading...</p>
      ) : !history || history.length === 0 ? (
        <p className="text-sm text-surface-400 dark:text-surface-500">No history yet.</p>
      ) : (
        <div>
          {history.map((entry, index) => (
            <TaskHistoryEntry
              key={entry.id}
              entry={entry}
              timeFormat={timeFormat}
              isLast={index === history.length - 1}
            />
          ))}
        </div>
      )}
    </ModalWrapper>
  );
};
