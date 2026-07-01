import Check from 'lucide-react/icons/check';
import Minus from 'lucide-react/icons/minus';
import X from 'lucide-react/icons/x';
import type { MouseEvent } from 'react';
import type { TaskStatus } from '$types';

interface TaskItemCheckboxProps {
  status: TaskStatus;
  flashComplete: boolean;
  checkmarkColor: string;
  useAccentColor: boolean;
  onClick: (e: MouseEvent) => void;
  disabled?: boolean;
  nativeDisabled?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
}

const checkboxBaseClass =
  'w-5 h-5 rounded-sm border-2 flex items-center justify-center transition-all outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset';

const getSelectionClass = (selected: boolean) =>
  selected
    ? `${checkboxBaseClass} bg-surface-800 dark:bg-surface-100 border-surface-800 dark:border-surface-100`
    : `${checkboxBaseClass} border-surface-400 dark:border-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700`;

const getCompletedClass = (useAccentColor: boolean) =>
  useAccentColor
    ? 'bg-primary-500 border-primary-500'
    : 'bg-status-completed border-status-completed';

export const TaskItemCheckbox = ({
  status,
  flashComplete,
  checkmarkColor,
  useAccentColor,
  onClick,
  disabled = false,
  nativeDisabled = disabled,
  selectionMode = false,
  selected = false,
}: TaskItemCheckboxProps) => {
  const isCompleted = status === 'completed' || flashComplete;
  const isCancelled = status === 'cancelled';
  const isInProcess = status === 'in-process';

  const getTitle = () => {
    if (selectionMode) return selected ? 'Remove from selection' : 'Select task';
    if (isCancelled) return 'Cancelled';
    if (isInProcess) return 'In Progress';
    if (status === 'completed') return 'Completed, click to reopen';
    return 'Mark complete';
  };

  const getClassName = () => {
    if (selectionMode) return getSelectionClass(selected);

    const disabledClass = disabled ? 'cursor-not-allowed opacity-70' : '';
    if (disabled) {
      if (isCompleted)
        return `${checkboxBaseClass} ${disabledClass} ${getCompletedClass(useAccentColor)}`;
      if (isCancelled)
        return `${checkboxBaseClass} ${disabledClass} bg-status-cancelled border-status-cancelled`;
      if (isInProcess)
        return `${checkboxBaseClass} ${disabledClass} bg-status-in-process border-status-in-process`;
      return `${checkboxBaseClass} ${disabledClass} border-surface-300 dark:border-surface-600`;
    }
    if (isCompleted) return `${checkboxBaseClass} ${getCompletedClass(useAccentColor)}`;
    if (isCancelled) return `${checkboxBaseClass} bg-status-cancelled border-status-cancelled`;
    if (isInProcess) return `${checkboxBaseClass} bg-status-in-process border-status-in-process`;
    return `${checkboxBaseClass} border-surface-300 dark:border-surface-600 hover:border-primary-500 hover:bg-surface-100 dark:hover:bg-surface-700`;
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={disabled && !selectionMode ? 'Unavailable for deleted task' : getTitle()}
      className={getClassName()}
      disabled={nativeDisabled}
      aria-disabled={disabled && !selectionMode}
      aria-pressed={selectionMode ? selected : undefined}
    >
      {selectionMode && selected && (
        <Check className="h-4 w-4 text-white dark:text-surface-900" strokeWidth={3} />
      )}
      {!selectionMode && isCompleted && (
        <Check
          className={`h-4 w-4 ${!useAccentColor ? 'text-surface-900' : ''}`}
          style={useAccentColor ? { color: checkmarkColor } : undefined}
          strokeWidth={3}
        />
      )}
      {!selectionMode && isCancelled && (
        <X className="h-4 w-4 text-primary-contrast" strokeWidth={3} />
      )}
      {!selectionMode && isInProcess && (
        <Minus className="h-4 w-4 dark:text-primary-contrast" strokeWidth={3} />
      )}
    </button>
  );
};
