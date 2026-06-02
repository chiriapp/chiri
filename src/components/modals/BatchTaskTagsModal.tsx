import Check from 'lucide-react/icons/check';
import Minus from 'lucide-react/icons/minus';
import Plus from 'lucide-react/icons/plus';
import Search from 'lucide-react/icons/search';
import { type ReactNode, useMemo, useState } from 'react';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { TagModal } from '$components/modals/TagModal';
import { getIconByName } from '$constants/icons';
import { useBatchUpdateTasks } from '$hooks/queries/useTasks';
import { useInitialFocusRef } from '$hooks/ui/useInitialFocusRef';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import type { Tag, Task } from '$types';

type TagSelectionState = 'all' | 'some' | 'none';

const tagRowButtonClass =
  "relative w-full text-sm rounded-lg transition-colors outline-hidden before:content-[''] before:pointer-events-none before:absolute before:inset-y-0 before:left-1.5 before:right-1.5 before:rounded-lg before:transition-colors hover:before:bg-surface-100 dark:hover:before:bg-surface-700 focus-visible:before:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset";
const tagRowContentClass = 'relative z-10 flex items-center gap-3 px-3 py-2.5';

interface BatchTaskTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: Tag[];
  tasks?: Task[];
  selectedTagIds?: string[];
  onSelectedTagIdsChange?: (tagIds: string[]) => void;
  title?: ReactNode;
  description?: ReactNode;
}

const getTagSelectionState = (tasks: Task[], tagId: string): TagSelectionState => {
  if (tasks.length === 0) return 'none';

  const taggedCount = tasks.filter((task) => (task.tags ?? []).includes(tagId)).length;
  if (taggedCount === tasks.length) return 'all';
  if (taggedCount > 0) return 'some';
  return 'none';
};

export const BatchTaskTagsModal = ({
  isOpen,
  onClose,
  tags,
  tasks,
  selectedTagIds = [],
  onSelectedTagIdsChange,
  title = 'Edit Tags',
  description,
}: BatchTaskTagsModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [createTagName, setCreateTagName] = useState<string | null>(null);
  const batchUpdateTasksMutation = useBatchUpdateTasks();
  const resolveAccent = useAccentColorResolver();
  const resolvedAccentColor = useResolvedAccentColor();
  const searchInputRef = useInitialFocusRef<HTMLInputElement>();
  const trimmedSearchQuery = searchQuery.trim();

  const filteredTags = useMemo(() => {
    const query = trimmedSearchQuery.toLowerCase();
    if (!query) return tags;
    return tags.filter((tag) => tag.name.toLowerCase().includes(query));
  }, [trimmedSearchQuery, tags]);

  const tagNameExists =
    trimmedSearchQuery.length > 0 &&
    tags.some((tag) => tag.name.trim().toLowerCase() === trimmedSearchQuery.toLowerCase());
  const canCreateTag = trimmedSearchQuery.length > 0 && !tagNameExists;
  const modalDescription =
    description ??
    (tasks ? `${tasks.length} selected ${tasks.length === 1 ? 'task' : 'tasks'}` : undefined);

  const getSelectionState = (tagId: string): TagSelectionState => {
    if (tasks) {
      return getTagSelectionState(tasks, tagId);
    }

    return selectedTagIds.includes(tagId) ? 'all' : 'none';
  };

  const updateTasksForTag = (tagId: string, shouldAddTag: boolean) => {
    if (!tasks) return;

    const updates = tasks.flatMap((task) => {
      const currentTags = task.tags ?? [];
      const nextTags = shouldAddTag
        ? [...currentTags.filter((id) => id !== tagId), tagId]
        : currentTags.filter((id) => id !== tagId);

      if (
        nextTags.length === currentTags.length &&
        nextTags.every((id) => currentTags.includes(id))
      ) {
        return [];
      }

      return [{ id: task.id, updates: { tags: nextTags } }];
    });

    if (updates.length > 0) {
      batchUpdateTasksMutation.mutate(updates);
    }
  };

  const updateSelectedTagIds = (tagId: string, shouldAddTag: boolean) => {
    const nextTagIds = shouldAddTag
      ? [...selectedTagIds.filter((id) => id !== tagId), tagId]
      : selectedTagIds.filter((id) => id !== tagId);

    if (
      nextTagIds.length === selectedTagIds.length &&
      nextTagIds.every((id) => selectedTagIds.includes(id))
    ) {
      return;
    }

    onSelectedTagIdsChange?.(nextTagIds);
  };

  const updateTagSelection = (tagId: string, shouldAddTag: boolean) => {
    if (onSelectedTagIdsChange) {
      updateSelectedTagIds(tagId, shouldAddTag);
    } else {
      updateTasksForTag(tagId, shouldAddTag);
    }
  };

  const handleToggleTag = (tagId: string) => {
    const selectionState = getSelectionState(tagId);
    updateTagSelection(tagId, selectionState !== 'all');
  };

  const openCreateTagModal = () => {
    setCreateTagName(trimmedSearchQuery);
  };

  const handleCreatedTag = (tag: Tag) => {
    updateTagSelection(tag.id, true);
    setSearchQuery('');
  };

  return (
    <>
      <ModalWrapper
        isOpen={isOpen && createTagName === null}
        onClose={onClose}
        title={title}
        description={modalDescription}
        zIndex="z-60"
        className="max-w-sm"
        contentPadding={false}
        footer={
          <ModalButton variant="primary" onClick={onClose}>
            Done
          </ModalButton>
        }
      >
        <div className="p-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags, or type to create..."
              className="w-full pl-9 pr-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
            />
          </div>
        </div>

        <div className="px-2 pt-1 pb-4 max-h-80 overflow-y-auto">
          <div className="space-y-1">
            {filteredTags.map((tag) => {
              const selectionState = getSelectionState(tag.id);
              const Icon = getIconByName(tag.icon || 'tag');
              const tagColor = tag.color ? resolveAccent(tag.color) : resolvedAccentColor;
              return (
                <button
                  type="button"
                  key={tag.id}
                  aria-pressed={selectionState === 'some' ? 'mixed' : selectionState === 'all'}
                  onClick={() => handleToggleTag(tag.id)}
                  className={tagRowButtonClass}
                >
                  <span className={tagRowContentClass}>
                    {tag.emoji ? (
                      <span className="text-xs leading-none" style={{ color: tagColor }}>
                        {tag.emoji}
                      </span>
                    ) : (
                      <Icon className="w-4 h-4" style={{ color: tagColor }} />
                    )}
                    <span className="text-surface-700 dark:text-surface-300 flex-1 text-left">
                      {tag.name}
                    </span>
                    <span
                      className={`w-5 h-5 rounded-sm border flex items-center justify-center shrink-0 ${
                        selectionState === 'none'
                          ? 'border-surface-300 dark:border-surface-600'
                          : 'border-primary-500 bg-primary-500 text-primary-contrast'
                      }`}
                    >
                      {selectionState === 'all' && <Check className="w-3.5 h-3.5" />}
                      {selectionState === 'some' && <Minus className="w-3.5 h-3.5" />}
                    </span>
                  </span>
                </button>
              );
            })}

            {filteredTags.length === 0 && tags.length > 0 && (
              <div className="px-3 py-2 text-sm text-surface-500 dark:text-surface-400">
                No tags match your search.
              </div>
            )}

            {tags.length === 0 && !trimmedSearchQuery && (
              <div className="px-3 py-2 text-sm text-surface-500 dark:text-surface-400">
                No tags available.
              </div>
            )}

            {(canCreateTag || tags.length === 0) && (
              <button type="button" onClick={openCreateTagModal} className={tagRowButtonClass}>
                <span className={`${tagRowContentClass} text-surface-700 dark:text-surface-300`}>
                  <Plus className="w-4 h-4 text-surface-400 shrink-0" />
                  {trimmedSearchQuery ? `Create tag "${trimmedSearchQuery}"` : 'Create a new tag'}
                </span>
              </button>
            )}
          </div>
        </div>
      </ModalWrapper>

      {isOpen && createTagName !== null && (
        <TagModal
          tagId={null}
          initialName={createTagName}
          onClose={() => setCreateTagName(null)}
          onSave={handleCreatedTag}
        />
      )}
    </>
  );
};
