import ChevronDown from 'lucide-react/icons/chevron-down';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Plus from 'lucide-react/icons/plus';
import { Tooltip } from '$components/Tooltip';
import { getIconByName } from '$data/icons';
import type { Tag, Task } from '$types/index';
import { getContrastTextColor } from '$utils/color';

interface SidebarTagsListProps {
  tags: Tag[];
  tasks: Task[];
  activeTagId: string | null;
  contextMenu: { type: string; id: string } | null;
  isAnyModalOpen: boolean;
  tagsSectionCollapsed: boolean;
  onToggleTagsSection: () => void;
  onSelectTag: (tagId: string) => void;
  onContextMenu: (
    e: React.MouseEvent,
    type: 'account' | 'calendar' | 'tag' | 'accounts-section',
    id: string,
    accountId?: string,
  ) => void;
  onAddTag: () => void;
}

const isActiveTask = (t: { status: string }) =>
  t.status !== 'completed' && t.status !== 'cancelled';

export const SidebarTagsList = ({
  tags,
  tasks,
  activeTagId,
  contextMenu,
  isAnyModalOpen,
  tagsSectionCollapsed,
  onToggleTagsSection,
  onSelectTag,
  onContextMenu,
  onAddTag,
}: SidebarTagsListProps) => {
  const getTagTaskCount = (tagId: string) =>
    tasks.filter((t) => (t.tags || []).includes(tagId) && isActiveTask(t)).length;

  return (
    <div>
      {/* biome-ignore lint/a11y/useSemanticElements: Section header toggle div contains icon+text layout that button element can't replicate */}
      <div
        onClick={onToggleTagsSection}
        onKeyDown={(e) => e.key === 'Enter' && onToggleTagsSection()}
        role="button"
        tabIndex={0}
        className="flex items-center justify-between px-3.5 py-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
      >
        <div className="flex items-center gap-1.5">
          {tagsSectionCollapsed ? (
            <ChevronRight className="w-4 h-4 text-surface-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-surface-400" />
          )}
          <span className="text-sm font-semibold text-surface-500 dark:text-surface-400 tracking-wider">
            Tags
          </span>
        </div>
        <Tooltip content="Add a new tag" position="top">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddTag();
            }}
            className={`p-1 rounded ${!isAnyModalOpen ? 'hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-700 dark:hover:text-surface-300' : ''} text-surface-500 dark:text-surface-400 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      {!tagsSectionCollapsed &&
        (tags.length === 0 ? (
          <div className="px-4 py-3 text-sm text-surface-500 dark:text-surface-400">
            No tags yet.
          </div>
        ) : (
          tags.map((tag) => {
            const TagIcon = getIconByName(tag.icon ?? 'tag');
            const isActive = activeTagId === tag.id;
            return (
              <button
                type="button"
                key={tag.id}
                data-context-menu
                onClick={() => onSelectTag(tag.id)}
                onContextMenu={(e) => onContextMenu(e, 'tag', tag.id)}
                className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : `text-surface-600 dark:text-surface-400 ${
                        contextMenu?.type === 'tag' && contextMenu.id === tag.id
                          ? 'bg-surface-200 dark:bg-surface-700'
                          : !isAnyModalOpen
                            ? 'hover:bg-surface-200 dark:hover:bg-surface-700'
                            : ''
                      }`
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: tag.color,
                        color: getContrastTextColor(tag.color),
                      }
                    : undefined
                }
              >
                {tag.emoji ? (
                  <span
                    className="text-xs leading-none"
                    style={{
                      color: isActive ? getContrastTextColor(tag.color) : tag.color,
                    }}
                  >
                    {tag.emoji}
                  </span>
                ) : (
                  <TagIcon
                    className="w-3.5 h-3.5"
                    style={{
                      color: isActive ? getContrastTextColor(tag.color) : tag.color,
                    }}
                  />
                )}
                <span className="flex-1 text-left truncate">{tag.name}</span>
                <span className="text-xs">{getTagTaskCount(tag.id)}</span>
              </button>
            );
          })
        ))}
    </div>
  );
};
