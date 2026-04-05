import Check from 'lucide-react/icons/check';
import Loader from 'lucide-react/icons/loader';
import X from 'lucide-react/icons/x';
import type { TaskStatus } from '$types';

interface TaskItemCheckboxProps {
  status: TaskStatus;
  flashComplete: boolean;
  checkmarkColor: string;
  onClick: (e: React.MouseEvent) => void;
}

export const TaskItemCheckbox = ({
  status,
  flashComplete,
  checkmarkColor,
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
    if (isCompleted) return `${base} bg-primary-500 border-primary-500`;
    if (isCancelled)
      return `${base} bg-rose-400 border-rose-400 dark:bg-rose-500 dark:border-rose-500`;
    if (isInProcess)
      return `${base} bg-blue-400 border-blue-400 dark:bg-blue-500 dark:border-blue-500`;
    return `${base} border-surface-300 dark:border-surface-600 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30`;
  };

  return (
    <button type="button" onClick={onClick} title={getTitle()} className={getClassName()}>
      {isCompleted && (
        <Check className="w-4 h-4" style={{ color: checkmarkColor }} strokeWidth={3} />
      )}
      {isCancelled && <X className="w-4 h-4 text-white dark:text-surface-200" strokeWidth={3} />}
      {isInProcess && <Loader className="w-4 h-4 text-white dark:text-blue-100" />}
    </button>
  );
};
