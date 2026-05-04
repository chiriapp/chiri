import Check from 'lucide-react/icons/check';
import Loader from 'lucide-react/icons/loader';
import X from 'lucide-react/icons/x';
import type { TaskStatus } from '$types';

interface TaskItemCheckboxProps {
  status: TaskStatus;
  flashComplete: boolean;
  checkmarkColor: string;
  useAccentColor: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export const TaskItemCheckbox = ({
  status,
  flashComplete,
  checkmarkColor,
  useAccentColor,
  onClick,
}: TaskItemCheckboxProps) => {
  const isCompleted = status === 'completed' || flashComplete;
  const isCancelled = status === 'cancelled';
  const isInProcess = status === 'in-process';

  const getTitle = () => {
    if (isCancelled) return 'Cancelled';
    if (isInProcess) return 'In Progress';
    if (status === 'completed') return 'Completed — click to reopen';
    return 'Mark complete';
  };

  const getClassName = () => {
    const base =
      'w-5 h-5 rounded-sm border-2 flex items-center justify-center transition-all outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset';
    if (isCompleted)
      return `${base} ${
        useAccentColor
          ? 'bg-primary-500 border-primary-500'
          : 'bg-status-completed border-status-completed'
      }`;
    if (isCancelled) return `${base} bg-status-cancelled border-status-cancelled`;
    if (isInProcess) return `${base} bg-status-in-process border-status-in-process`;
    return `${base} border-surface-300 dark:border-surface-600 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30`;
  };

  return (
    <button type="button" onClick={onClick} aria-label={getTitle()} className={getClassName()}>
      {isCompleted && (
        <Check className="w-4 h-4" style={{ color: checkmarkColor }} strokeWidth={3} />
      )}
      {isCancelled && <X className="w-4 h-4 text-white dark:text-surface-200" strokeWidth={3} />}
      {isInProcess && <Loader className="w-4 h-4 text-white dark:text-surface-100" />}
    </button>
  );
};
