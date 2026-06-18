import type { MouseEvent } from 'react';
import { getIconByName } from '$constants/icons';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import type { Tag } from '$types';

export const TaskItemTagBadge = ({
  tag,
  onTagClick,
}: {
  tag: Tag;
  onTagClick: (tagId: string, event: MouseEvent) => void;
}) => {
  const resolveAccent = useAccentColorResolver();
  const resolvedAccentColor = useResolvedAccentColor();
  const TagIcon = getIconByName(tag.icon || 'tag');
  const tagColor = tag.color ? resolveAccent(tag.color) : resolvedAccentColor;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onTagClick(tag.id, e);
      }}
      className="inline-flex items-center gap-1 rounded-sm border bg-surface-100 px-2 py-0.5 font-medium text-surface-700 text-xs outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
      style={{ borderColor: tagColor }}
    >
      {tag.emoji ? (
        <span className="text-xs leading-none" style={{ color: tagColor }}>
          {tag.emoji}
        </span>
      ) : (
        <TagIcon className="h-3 w-3" style={{ color: tagColor }} />
      )}
      {tag.name}
    </button>
  );
};
