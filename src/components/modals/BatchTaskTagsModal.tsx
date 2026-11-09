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
import type { Tag } from '$types/tag';
import type { Task } from '$types/task/model';

type TagSelectionState = 'all' | 'some' | 'none';

const tagRowButtonClass =
  "relative w-full text-sm rounded-lg transition-colors outline-hidden before:content-[''] before:pointer-events-none before:absolute before:inset-y-0 before:left-1.5 before:right-1.5 before:rounded-lg before:transition-colors hover:before:bg-surface-100 dark:hover:before:bg-surface-700 focus-visible:before:ring-2 focus-visible:before:ring-primary-ink focus-visible:before:ring-inset";
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

const getTagSelectionState = (
  tasks: Task[],
  pendingTaskTags: Map<string, string[]>,
  tagId: string,
): TagSelectionState => {
  if (tasks.length === 0) return 'none';

  const taggedCount = tasks.filter((task) =>
    (pendingTaskTags.get(task.id) ?? []).includes(tagId),
  ).length;
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
  title = tasks && tasks.length > 0 && tasks.every((task) => (task.tags ?? []).length === 0)
    ? 'Add Tags'
    : 'Edit Tags',
  description,
}: BatchTaskTagsModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [createTagName, setCreateTagName] = useState<string | null>(null);
  const [pendingSelectedTagIds, setPendingSelectedTagIds] = useState(selectedTagIds);
  const [pendingTaskTags, setPendingTaskTags] = useState<Map<string, string[]>>(
    () => new Map(tasks?.map((task) => [task.id, task.tags ?? []])),
  );
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

  const hasChanges = useMemo(() => {
    if (tasks) {
      return tasks.some((task) => {
        const originalTags = task.tags ?? [];
        const pendingTags = pendingTaskTags.get(task.id) ?? [];
        if (pendingTags.length !== originalTags.length) return true;
        return pendingTags.some((id) => !originalTags.includes(id));
      });
    }

    if (pendingSelectedTagIds.length !== selectedTagIds.length) return true;
    return pendingSelectedTagIds.some((id) => !selectedTagIds.includes(id));
  }, [tasks, pendingTaskTags, pendingSelectedTagIds, selectedTagIds]);

  const getSelectionState = (tagId: string): TagSelectionState => {
    if (tasks) {
      return getTagSelectionState(tasks, pendingTaskTags, tagId);
    }

    return pendingSelectedTagIds.includes(tagId) ? 'all' : 'none';
  };

  const updatePendingTaskTags = (tagId: string, shouldAddTag: boolean) => {
    setPendingTaskTags((current) => {
      const next = new Map(current);
      for (const task of tasks ?? []) {
        const currentTags = next.get(task.id) ?? [];
        const nextTags = shouldAddTag
          ? [...currentTags.filter((id) => id !== tagId), tagId]
          : currentTags.filter((id) => id !== tagId);
        next.set(task.id, nextTags);
      }
      return next;
    });
  };

  const updatePendingSelectedTagIds = (tagId: string, shouldAddTag: boolean) => {
    setPendingSelectedTagIds((current) =>
      shouldAddTag
        ? [...current.filter((id) => id !== tagId), tagId]
        : current.filter((id) => id !== tagId),
    );
  };

  const updateTagSelection = (tagId: string, shouldAddTag: boolean) => {
    if (onSelectedTagIdsChange) {
      updatePendingSelectedTagIds(tagId, shouldAddTag);
    } else {
      updatePendingTaskTags(tagId, shouldAddTag);
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

  const handleDone = () => {
    if (tasks) {
      const updates = tasks.flatMap((task) => {
        const originalTags = task.tags ?? [];
        const nextTags = pendingTaskTags.get(task.id) ?? [];

        if (
          nextTags.length === originalTags.length &&
          nextTags.every((id) => originalTags.includes(id))
        ) {
          return [];
        }

        return [{ id: task.id, updates: { tags: nextTags } }];
      });

      if (updates.length > 0) {
        batchUpdateTasksMutation.mutate(updates);
      }
    } else {
      const hasChanges =
        pendingSelectedTagIds.length !== selectedTagIds.length ||
        !pendingSelectedTagIds.every((id) => selectedTagIds.includes(id));
      if (hasChanges) {
        onSelectedTagIdsChange?.(pendingSelectedTagIds);
      }
    }

    onClose();
  };

  const handleCancel = () => {
    setPendingSelectedTagIds(selectedTagIds);
    setPendingTaskTags(new Map(tasks?.map((task) => [task.id, task.tags ?? []])));
    onClose();
  };

  return (
    <>
      <ModalWrapper
        isOpen={isOpen && createTagName === null}
        onClose={handleCancel}
        title={title}
        description={modalDescription}
        zIndex="z-60"
        className="max-w-sm"
        contentPadding={false}
        footer={
          <>
            <ModalButton variant="secondary" onClick={handleCancel}>
              Cancel
            </ModalButton>
            <ModalButton variant="primary" onClick={handleDone} disabled={!hasChanges}>
              Done
            </ModalButton>
          </>
        }
      >
        <div className="p-4 pb-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-surface-500 dark:text-surface-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags, or type to create..."
              className="w-full rounded-lg border border-transparent bg-surface-100 py-2 pr-3 pl-9 text-sm text-surface-800 transition-colors focus:border-primary-ink focus:bg-white focus:outline-hidden dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto px-2 pt-1 pb-4">
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
                      <Icon className="h-4 w-4" style={{ color: tagColor }} />
                    )}
                    <span className="flex-1 text-left text-surface-700 dark:text-surface-300">
                      {tag.name}
                    </span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border ${
                        selectionState === 'none'
                          ? 'border-surface-400 dark:border-surface-600'
                          : 'border-primary-500 bg-primary-500 text-primary-contrast'
                      }`}
                    >
                      {selectionState === 'all' && <Check className="h-3.5 w-3.5" />}
                      {selectionState === 'some' && <Minus className="h-3.5 w-3.5" />}
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
              <div className="px-3 py-2.5 text-sm text-surface-500 dark:text-surface-400">
                No tags available.
              </div>
            )}

            {canCreateTag && (
              <button type="button" onClick={openCreateTagModal} className={tagRowButtonClass}>
                <span className={`${tagRowContentClass} text-surface-700 dark:text-surface-300`}>
                  <Plus className="h-4 w-4 shrink-0 text-surface-500 dark:text-surface-400" />
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
