import Trash2 from 'lucide-react/icons/trash-2';
import X from 'lucide-react/icons/x';
import { Tooltip } from '$components/Tooltip';

interface TaskEditorHeaderProps {
  onDelete: () => void;
  onClose: () => void;
}

export const TaskEditorHeader = ({ onDelete, onClose }: TaskEditorHeaderProps) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
      <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">Edit task</h2>
      <div className="flex items-center gap-2">
        <Tooltip content="Delete" position="bottom">
          <button
            type="button"
            onClick={onDelete}
            className="p-2 text-surface-500 hover:text-semantic-error hover:bg-semantic-error/10 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            aria-label="Delete task"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </Tooltip>

        <Tooltip content="Close" position="bottom">
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            aria-label="Close editor"
          >
            <X className="w-5 h-5" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
