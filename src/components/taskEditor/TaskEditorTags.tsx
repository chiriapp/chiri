import Pencil from 'lucide-react/icons/pencil';
import Plus from 'lucide-react/icons/plus';
import TagIcon from 'lucide-react/icons/tag';
import TagX from 'lucide-react/icons/tag-x';
import X from 'lucide-react/icons/x';
import { TaskEditorEmptyState } from '$components/taskEditor/TaskEditorEmptyState';
import { getIconByName } from '$constants/icons';
import type { Tag, Task } from '$types';

interface TagsProps {
  task: Task;
  tags: Tag[];
  onRemoveTag: (tagId: string) => void;
  onOpenTagsModal: () => void;
  readOnly?: boolean;
}

export const TaskEditorTags = ({
  task,
  tags,
  onRemoveTag,
  onOpenTagsModal,
  readOnly = false,
}: TagsProps) => {
  const taskTags = (task.tags || [])
    .map((tagId) => tags.find((t) => t.id === tagId))
    .filter(Boolean);

  return (
    <div>
      <div
        id="tag-label"
        className="mb-2 flex items-center gap-2 font-medium text-sm text-surface-600 dark:text-surface-400"
      >
        <TagIcon className="h-4 w-4" />
        Tags
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: fieldset would change semantic structure; div with role="group" is appropriate here */}
      <div
        className="flex min-h-6.5 flex-wrap items-start gap-2"
        role="group"
        aria-labelledby="tag-label"
      >
        {taskTags.map((tag) => {
          if (!tag) return null;
          const Icon = getIconByName(tag.icon ?? 'tag');
          return (
            <span
              key={tag.id}
              className={`group box-border inline-flex h-6.5 items-center gap-1.5 rounded-sm border pr-1 pl-2 font-medium text-xs leading-none ${
                readOnly ? 'cursor-not-allowed' : ''
              }`}
              style={{
                borderColor: tag.color,
                backgroundColor: `${tag.color}15`,
                color: tag.color,
              }}
            >
              {tag.emoji ? (
                <span className="text-xs leading-none">{tag.emoji}</span>
              ) : (
                <Icon className="h-3 w-3" />
              )}
              {tag.name}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onRemoveTag(tag.id)}
                  className="rounded-sm p-0.5 outline-hidden transition-colors hover:bg-black/10 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:hover:bg-white/10"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          );
        })}

        {readOnly && taskTags.length === 0 && (
          <TaskEditorEmptyState icon={<TagX className="h-4 w-4 shrink-0" />}>
            No tags
          </TaskEditorEmptyState>
        )}

        {!readOnly && (
          <button
            type="button"
            onClick={onOpenTagsModal}
            className="box-border inline-flex h-6.5 items-center gap-1 rounded-sm border border-surface-200 bg-surface-50 px-2 text-surface-500 text-xs leading-none outline-hidden transition-colors hover:border-surface-400 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:border-surface-600 dark:bg-surface-800 dark:text-surface-400 dark:hover:border-surface-500"
          >
            {taskTags.length > 0 ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {taskTags.length > 0 ? 'Edit tags' : 'Add tag'}
          </button>
        )}
      </div>
    </div>
  );
};
