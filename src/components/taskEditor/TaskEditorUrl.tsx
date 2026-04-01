import { openUrl } from '@tauri-apps/plugin-opener';
import ExternalLink from 'lucide-react/icons/external-link';
import Link from 'lucide-react/icons/link';
import { useEffect, useRef } from 'react';
import { ComposedTextarea } from '$components/ComposedTextarea';
import { useDebouncedTaskUpdate } from '$hooks/ui/useDebouncedTaskUpdate';
import type { Task } from '$types';

interface UrlProps {
  task: Task;
}

export const TaskEditorUrl = ({ task }: UrlProps) => {
  const [pendingUrl, updatePendingUrl] = useDebouncedTaskUpdate(task.id, 'url', task.url ?? '');

  const urlRef = useRef<HTMLTextAreaElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Need to trigger on pendingUrl changes
  useEffect(() => {
    const textarea = urlRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
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
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor="task-url"
          className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400"
        >
          <Link className="w-4 h-4" />
          URL
        </label>
        {pendingUrl && (
          <button
            type="button"
            onClick={() => openUrl(pendingUrl)}
            className="flex items-center gap-1 text-xs text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded transition-colors"
            aria-label="Open URL in browser"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open
          </button>
        )}
      </div>
      <ComposedTextarea
        ref={urlRef}
        id="task-url"
        value={pendingUrl}
        onChange={handleUrlChange}
        placeholder="https://example.com"
        rows={1}
        className="w-full px-3 py-2.5 text-sm text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-800 border border-transparent rounded-lg focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors resize-none overflow-hidden max-h-24"
      />
    </div>
  );
};
