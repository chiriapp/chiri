import { getIconByName } from '$constants/icons';
import type { Tag } from '$types';

export const TaskItemTagBadge = ({
  tag,
  onTagClick,
}: {
  tag: Tag;
  onTagClick: (tagId: string) => void;
}) => {
  const TagIcon = getIconByName(tag.icon || 'tag');
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onTagClick(tag.id);
      }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium hover:opacity-80 transition-opacity border bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
      style={{ borderColor: tag.color }}
    >
      {tag.emoji ? (
        <span className="text-xs leading-none" style={{ color: tag.color }}>
          {tag.emoji}
        </span>
      ) : (
        <TagIcon className="w-3 h-3" style={{ color: tag.color }} />
      )}
      {tag.name}
    </button>
  );
};
