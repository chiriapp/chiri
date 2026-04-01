import AlignLeft from 'lucide-react/icons/align-left';
import { useRef } from 'react';
import { ComposedTextarea } from '$components/ComposedTextarea';
import { useDebouncedTaskUpdate } from '$hooks/ui/useDebouncedTaskUpdate';
import { filterCalDavDescription } from '$lib/ical/vtodo';
import type { Task } from '$types';

interface DescriptionProps {
  task: Task;
}

export const TaskEditorDescription = ({ task }: DescriptionProps) => {
  const [pendingDescription, updatePendingDescription] = useDebouncedTaskUpdate(
    task.id,
    'description',
    task.description ?? '',
  );

  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const handleDescriptionChange = (value: string, cursorPos?: number | null) => {
    updatePendingDescription(value);
    requestAnimationFrame(() => {
      if (descriptionRef.current && cursorPos !== null && cursorPos !== undefined) {
        descriptionRef.current.setSelectionRange(cursorPos, cursorPos);
      }
    });
  };

  return (
    <div>
      <label
        htmlFor="task-description"
        className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
      >
        <AlignLeft className="w-4 h-4" />
        Description
      </label>
      <ComposedTextarea
        ref={descriptionRef}
        id="task-description"
        value={filterCalDavDescription(pendingDescription)}
        onChange={handleDescriptionChange}
        placeholder="Add a description..."
        rows={4}
        className="w-full px-3 py-2 text-sm text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-800 border border-transparent rounded-lg focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors resize-none"
      />
    </div>
  );
};
