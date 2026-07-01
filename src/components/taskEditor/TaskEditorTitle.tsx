import Check from 'lucide-react/icons/check';
import Minus from 'lucide-react/icons/minus';
import Type from 'lucide-react/icons/type';
import X from 'lucide-react/icons/x';
import { type MouseEvent, useEffect, useRef } from 'react';
import { ComposedTextarea } from '$components/ComposedTextarea';
import { useToggleTaskComplete } from '$hooks/queries/useTasks';
import { consumeSelectedTaskTitleAutofocus } from '$hooks/queries/useUIState';
import { useDebouncedTaskUpdate } from '$hooks/ui/useDebouncedTaskUpdate';
import type { Task } from '$types';

interface TaskEditorTitleProps {
  task: Task;
  checkmarkColor: string;
  useAccentColorForCheckboxes: boolean;
  readOnly?: boolean;
}

const getCheckboxStateClass = (
  task: Task,
  useAccentColorForCheckboxes: boolean,
  readOnly: boolean,
) => {
  if (task.status === 'completed') {
    return useAccentColorForCheckboxes
      ? 'bg-primary-500 border-primary-500'
      : 'bg-status-completed border-status-completed';
  }
  if (task.status === 'cancelled') return 'bg-status-cancelled border-status-cancelled';
  if (task.status === 'in-process') return 'bg-status-in-process border-status-in-process';

  return `border-surface-300 dark:border-surface-600 ${
    readOnly ? '' : 'hover:border-primary-500 hover:bg-surface-100 dark:hover:bg-surface-700'
  }`;
};

const getCheckboxAriaLabel = (task: Task, readOnly: boolean) => {
  if (readOnly) return 'Task status';
  if (task.status === 'cancelled') return 'Cancelled';
  if (task.status === 'in-process') return 'In Progress';
  if (task.status === 'completed') return 'Completed, click to reopen';
  return 'Mark complete';
};

export const TaskEditorTitle = ({
  task,
  checkmarkColor,
  useAccentColorForCheckboxes,
  readOnly = false,
}: TaskEditorTitleProps) => {
  const [pendingTitle, updatePendingTitle] = useDebouncedTaskUpdate(task.id, 'title', task.title);
  const toggleTaskCompleteMutation = useToggleTaskComplete();
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // focus newly-created blank tasks once, without stealing focus on later visits
  useEffect(() => {
    if (readOnly) return;
    if (!task.title && titleRef.current && consumeSelectedTaskTitleAutofocus(task.id)) {
      titleRef.current.focus();
    }
  }, [readOnly, task.id, task.title]);

  // auto-resize title textarea based on content
  useEffect(() => {
    const textarea = titleRef.current;
    if (!textarea) return;
    // skip if DOM value has not reflected the latest state yet
    if (textarea.value !== pendingTitle) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [pendingTitle]);

  const handleTitleChange = (value: string, cursorPos?: number | null) => {
    updatePendingTitle(value);
    requestAnimationFrame(() => {
      if (titleRef.current && cursorPos !== null && cursorPos !== undefined) {
        titleRef.current.setSelectionRange(cursorPos, cursorPos);
      }
    });
  };

  const handleCheckboxClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    toggleTaskCompleteMutation.mutate(task.id);
  };

  const checkboxStateClass = getCheckboxStateClass(task, useAccentColorForCheckboxes, readOnly);

  return (
    <div>
      <label
        htmlFor={readOnly ? undefined : 'task-title'}
        className="mb-2 flex items-center gap-2 font-medium text-sm text-surface-600 dark:text-surface-400"
      >
        <Type className="h-4 w-4" />
        Title
      </label>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Wrapper div focuses child textarea for better UX */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Click focuses child textarea which is already keyboard accessible */}
      <div
        onClick={(e) => {
          if (readOnly) return;
          if (
            titleRef.current &&
            e.target !== titleRef.current &&
            !(e.target as HTMLElement).closest('button')
          ) {
            titleRef.current.focus();
          }
        }}
        className={`flex items-start gap-3 rounded-lg border border-transparent bg-surface-100 px-3 py-3 transition-colors dark:bg-surface-800 ${
          readOnly
            ? 'cursor-not-allowed'
            : 'cursor-text focus-within:border-primary-500 focus-within:bg-white dark:focus-within:bg-surface-800'
        }`}
      >
        <button
          type="button"
          onClick={handleCheckboxClick}
          disabled={readOnly}
          aria-label={getCheckboxAriaLabel(task, readOnly)}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 outline-hidden transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset disabled:cursor-not-allowed ${checkboxStateClass}
          `}
        >
          {task.status === 'completed' && (
            <Check
              className={`h-4 w-4 ${!useAccentColorForCheckboxes ? 'text-surface-900' : ''}`}
              style={useAccentColorForCheckboxes ? { color: checkmarkColor } : undefined}
              strokeWidth={3}
            />
          )}
          {task.status === 'cancelled' && (
            <X className="h-4 w-4 text-primary-contrast" strokeWidth={3} />
          )}
          {task.status === 'in-process' && (
            <Minus className="h-4 w-4 dark:text-primary-contrast" strokeWidth={3} />
          )}
        </button>
        {readOnly ? (
          <div className="selectable flex-1 cursor-not-allowed whitespace-pre-wrap font-medium text-sm text-surface-700 dark:text-surface-300">
            {pendingTitle || (
              <span className="text-surface-400 dark:text-surface-500">Untitled task</span>
            )}
          </div>
        ) : (
          <ComposedTextarea
            ref={titleRef}
            id="task-title"
            value={pendingTitle}
            onChange={handleTitleChange}
            placeholder={task.parentUid ? 'Subtask title...' : 'Task title...'}
            rows={1}
            className="w-full flex-1 resize-none overflow-hidden border-0 bg-transparent p-0 font-medium text-sm text-surface-700 focus:outline-hidden focus:ring-0 dark:text-surface-300"
          />
        )}
      </div>
    </div>
  );
};
