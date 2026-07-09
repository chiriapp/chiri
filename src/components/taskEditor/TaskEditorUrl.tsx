import { openUrl } from '@tauri-apps/plugin-opener';
import ExternalLink from 'lucide-react/icons/external-link';
import Link from 'lucide-react/icons/link';
import Unlink from 'lucide-react/icons/unlink';
import { useEffect, useRef } from 'react';
import { ComposedTextarea } from '$components/ComposedTextarea';
import { TaskEditorEmptyState } from '$components/taskEditor/TaskEditorEmptyState';
import { useDebouncedTaskUpdate } from '$hooks/ui/useDebouncedTaskUpdate';
import type { Task } from '$types';

interface UrlProps {
  task: Task;
  readOnly?: boolean;
}

export const TaskEditorUrl = ({ task, readOnly = false }: UrlProps) => {
  const [pendingUrl, updatePendingUrl] = useDebouncedTaskUpdate(task.id, 'url', task.url ?? '');

  const urlRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = urlRef.current;
    if (!textarea) return;
    // skip if DOM value has not reflected the latest state yet
    if (textarea.value !== pendingUrl) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [pendingUrl]);

  const handleUrlChange = (value: string, cursorPos?: number | null) => {
    updatePendingUrl(value);
    requestAnimationFrame(() => {
      if (urlRef.current && cursorPos !== null && cursorPos !== undefined) {
        urlRef.current.setSelectionRange(cursorPos, cursorPos);
      }
    });
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label
          htmlFor={readOnly ? undefined : 'task-url'}
          className="flex items-center gap-2 font-medium text-sm text-surface-600 dark:text-surface-400"
        >
          <Link className="h-4 w-4" />
          URL
        </label>
        {pendingUrl && (
          <button
            type="button"
            onClick={() => openUrl(pendingUrl)}
            className="flex items-center gap-1 rounded-sm text-primary-500 text-xs outline-hidden transition-colors hover:text-primary-600 focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:text-primary-300"
            aria-label="Open URL in browser"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </button>
        )}
      </div>
      {readOnly ? (
        pendingUrl ? (
          <div className="wrap-break-word selectable w-full cursor-not-allowed whitespace-pre-wrap rounded-lg border border-transparent bg-surface-100 px-3 py-2.5 text-sm text-surface-700 dark:bg-surface-800 dark:text-surface-300">
            {pendingUrl}
          </div>
        ) : (
          <TaskEditorEmptyState icon={<Unlink className="h-4 w-4 shrink-0" />}>
            No URL
          </TaskEditorEmptyState>
        )
      ) : (
        <ComposedTextarea
          ref={urlRef}
          id="task-url"
          value={pendingUrl}
          onChange={handleUrlChange}
          placeholder="https://example.com"
          rows={1}
          className="max-h-24 w-full resize-none overflow-hidden rounded-lg border border-transparent bg-surface-100 px-3 py-2.5 text-sm text-surface-700 transition-colors focus:border-primary-500 focus:bg-white focus:outline-hidden dark:bg-surface-800 dark:text-surface-300 dark:focus:bg-surface-800"
        />
      )}
    </div>
  );
};
