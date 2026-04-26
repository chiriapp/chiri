import Check from 'lucide-react/icons/check';
import Loader from 'lucide-react/icons/loader';
import Type from 'lucide-react/icons/type';
import X from 'lucide-react/icons/x';
import { useEffect, useRef } from 'react';
import { ComposedTextarea } from '$components/ComposedTextarea';
import { useToggleTaskComplete } from '$hooks/queries/useTasks';
import { useDebouncedTaskUpdate } from '$hooks/ui/useDebouncedTaskUpdate';
import type { Task } from '$types';

interface TaskEditorTitleProps {
  task: Task;
  checkmarkColor: string;
}

export const TaskEditorTitle = ({ task, checkmarkColor }: TaskEditorTitleProps) => {
  const [pendingTitle, updatePendingTitle] = useDebouncedTaskUpdate(task.id, 'title', task.title);
  const toggleTaskCompleteMutation = useToggleTaskComplete();
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // focus title on open if empty
  useEffect(() => {
    if (!task.title && titleRef.current) {
      titleRef.current.focus();
    }
  }, [task.title]);

  // Auto-resize title textarea based on content
  useEffect(() => {
    const textarea = titleRef.current;
    if (!textarea) return;
    // Skip if DOM value has not reflected the latest state yet.
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

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTaskCompleteMutation.mutate(task.id);
  };

  return (
    <div>
      <label
        htmlFor="task-title"
        className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
      >
        <Type className="w-4 h-4" />
        Title
      </label>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Wrapper div focuses child textarea for better UX */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Click focuses child textarea which is already keyboard accessible */}
      <div
        onClick={(e) => {
          if (
            titleRef.current &&
            e.target !== titleRef.current &&
            !(e.target as HTMLElement).closest('button')
          ) {
            titleRef.current.focus();
          }
        }}
        className="flex items-start gap-3 px-3 py-3 bg-surface-100 dark:bg-surface-800 border border-transparent rounded-lg has-focus:border-primary-500 has-[textarea:focus]:bg-white dark:has-[textarea:focus]:bg-surface-800 transition-colors cursor-text"
      >
        <button
          type="button"
          onClick={handleCheckboxClick}
          aria-label={
            task.status === 'cancelled'
              ? 'Cancelled'
              : task.status === 'in-process'
                ? 'In Progress'
                : task.status === 'completed'
                  ? 'Completed — click to reopen'
                  : 'Mark complete'
          }
          className={`
            shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset
            ${
              task.status === 'completed'
                ? 'bg-primary-500 border-primary-500'
                : task.status === 'cancelled'
                  ? 'bg-rose-400 border-rose-400 dark:bg-rose-500 dark:border-rose-500'
                  : task.status === 'in-process'
                    ? 'bg-blue-400 border-blue-400 dark:bg-blue-500 dark:border-blue-500'
                    : 'border-surface-300 dark:border-surface-600 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30'
            }
          `}
        >
          {task.status === 'completed' && (
            <Check className="w-4 h-4" style={{ color: checkmarkColor }} strokeWidth={3} />
          )}
          {task.status === 'cancelled' && (
            <X className="w-4 h-4 text-white dark:text-surface-200" strokeWidth={3} />
          )}
          {task.status === 'in-process' && (
            <Loader className="w-4 h-4 text-white dark:text-blue-100" />
          )}
        </button>
        <ComposedTextarea
          ref={titleRef}
          id="task-title"
          value={pendingTitle}
          onChange={handleTitleChange}
          placeholder="Task title..."
          rows={1}
          className="flex-1 text-sm font-medium text-surface-700 dark:text-surface-300 bg-transparent border-0 focus:outline-hidden focus:ring-0 p-0 overflow-hidden resize-none w-full"
        />
      </div>
    </div>
  );
};
