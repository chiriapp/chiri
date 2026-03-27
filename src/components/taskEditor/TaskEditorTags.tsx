import Plus from 'lucide-react/icons/plus';
import TagIcon from 'lucide-react/icons/tag';
import X from 'lucide-react/icons/x';
import { getIconByName } from '$data/icons';
import { getAllTags } from '$lib/store/tags';
import type { Tag, Task } from '$types/index';

interface TagsProps {
  task: Task;
  tags: Tag[];
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  onOpenTagPicker: () => void;
}

export const TaskEditorTags = ({ task, onRemoveTag, onOpenTagPicker }: TagsProps) => {
  const taskTags = (task.tags || [])
    .map((tagId) => getAllTags().find((t) => t.id === tagId))
    .filter(Boolean);

  return (
    <div>
      <div
        id="tag-label"
        className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
      >
        <TagIcon className="w-4 h-4" />
        Tags
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: fieldset would change semantic structure; div with role="group" is appropriate here */}
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby="tag-label">
        {taskTags.map((tag) => {
          if (!tag) return null;
          const Icon = getIconByName(tag.icon ?? 'tag');
          return (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded border text-xs font-medium group"
              style={{
                borderColor: tag.color,
                backgroundColor: `${tag.color}15`,
                color: tag.color,
              }}
            >
              {tag.emoji ? (
                <span className="text-xs leading-none">{tag.emoji}</span>
              ) : (
                <Icon className="w-3 h-3" />
              )}
              {tag.name}
              <button
                type="button"
                onClick={() => onRemoveTag(tag.id)}
                className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}

        <button
          type="button"
          onClick={onOpenTagPicker}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-surface-50 dark:bg-surface-800 text-surface-500 dark:text-surface-400 border border-surface-200 dark:border-surface-600 rounded hover:border-surface-400 dark:hover:border-surface-500 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
        >
          <Plus className="w-3 h-3" />
          Add tag
        </button>
      </div>
    </div>
  );
};
