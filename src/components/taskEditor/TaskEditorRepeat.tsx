import RefreshCw from 'lucide-react/icons/refresh-cw';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import type { Task } from '$types';
import { rruleToText } from '$utils/recurrence';

interface TaskEditorRepeatProps {
  task: Task;
  onOpen: () => void;
}

export const TaskEditorRepeat = ({ task, onOpen }: TaskEditorRepeatProps) => {
  const { dateFormat } = useSettingsStore();
  const summary = task.rrule ? rruleToText(task.rrule, task.repeatFrom, dateFormat) : null;

  return (
    <div>
      <div
        id="repeat-label"
        className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
      >
        <RefreshCw className="w-4 h-4" />
        Repeat
      </div>
      <button
        type="button"
        onClick={onOpen}
        aria-labelledby="repeat-label"
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left bg-surface-100 dark:bg-surface-800 border border-transparent rounded-lg hover:border-surface-300 dark:hover:border-surface-500 focus:outline-hidden focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
      >
        <RefreshCw className="w-4 h-4 text-surface-400 shrink-0" />
        <span className={summary ? 'text-surface-700 dark:text-surface-300' : 'text-surface-400'}>
          {summary ?? 'Set repeat rules...'}
        </span>
      </button>
    </div>
  );
};
