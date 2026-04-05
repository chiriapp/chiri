import History from 'lucide-react/icons/history';
import { useState } from 'react';
import { TaskHistoryModal } from '$components/modals/TaskHistoryModal';
import { Tooltip } from '$components/Tooltip';
import type { Task, TimeFormat } from '$types';
import { formatDate, formatTime } from '$utils/date';

interface TaskEditorFooterProps {
  task: Task;
  timeFormat: TimeFormat;
}

export const TaskEditorFooter = ({ task, timeFormat }: TaskEditorFooterProps) => {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between p-4 border-t border-surface-200 dark:border-surface-700 text-xs text-surface-400">
        <div>
          <div>
            Created: {formatDate(new Date(task.createdAt), true)}{' '}
            {formatTime(new Date(task.createdAt), timeFormat)}
          </div>
          <div>
            Modified: {formatDate(new Date(task.modifiedAt), true)}{' '}
            {formatTime(new Date(task.modifiedAt), timeFormat)}
          </div>
        </div>
        <Tooltip content="History" position="top">
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            aria-label="View task history"
          >
            <History className="w-5 h-5" />
          </button>
        </Tooltip>
      </div>

      <TaskHistoryModal
        isOpen={showHistory}
        taskTitle={task.title}
        taskUid={task.uid}
        onClose={() => setShowHistory(false)}
      />
    </>
  );
};
