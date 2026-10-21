import ArrowRight from 'lucide-react/icons/arrow-right';
import Plus from 'lucide-react/icons/plus';
import type { KeyboardEvent, MouseEvent, RefObject } from 'react';

interface TaskQuickAddInputProps {
  inputRef: RefObject<HTMLInputElement | null>;
  onCreate: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onTitleChange: (title: string) => void;
  title: string;
}

export const TaskQuickAddInput = ({
  inputRef,
  onCreate,
  onKeyDown,
  onTitleChange,
  title,
}: TaskQuickAddInputProps) => {
  const hasTitle = title.trim().length > 0;

  return (
    <div className="app-task-list shrink-0 bg-surface-50 px-4 py-4 dark:bg-surface-900">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: wrapper focuses the nested input when clicking its non-interactive area */}
      <div
        onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
          const target = event.target as HTMLElement;
          if (target.closest('button') || target === inputRef.current) return;
          event.preventDefault();
          inputRef.current?.focus();
        }}
        className="flex w-full cursor-text items-center gap-3 rounded-lg border border-transparent bg-surface-100/70 px-3 py-1.5 text-surface-500 outline-hidden transition-colors focus-within:border-primary-ink focus-within:bg-surface-50 hover:bg-surface-100 dark:bg-surface-800/70 dark:text-surface-400 dark:hover:bg-surface-800 dark:focus-within:border-primary-ink dark:focus-within:bg-surface-800/80"
      >
        <label
          htmlFor="add-task-input"
          className="flex min-w-0 flex-1 cursor-text items-center gap-3"
        >
          <Plus className="h-4 w-4" />
          <input
            ref={inputRef}
            id="add-task-input"
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Add a task..."
            aria-label="Add a task"
            className="min-w-0 flex-1 bg-transparent text-surface-700 outline-hidden placeholder:text-surface-500 dark:text-surface-300 dark:placeholder:text-surface-400"
          />
        </label>
        {hasTitle ? (
          <button
            type="button"
            onClick={onCreate}
            aria-label="Add task"
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-surface-400 outline-hidden transition-colors hover:bg-surface-200 hover:text-surface-700 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:text-surface-500 dark:hover:bg-surface-700 dark:hover:text-surface-300"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <span className="h-6 w-6 shrink-0" aria-hidden="true" />
        )}
      </div>
    </div>
  );
};
