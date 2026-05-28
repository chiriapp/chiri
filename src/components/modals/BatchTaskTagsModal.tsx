import Check from 'lucide-react/icons/check';
import Minus from 'lucide-react/icons/minus';
import Search from 'lucide-react/icons/search';
import { useMemo, useState } from 'react';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { getIconByName } from '$constants/icons';
import { useBatchUpdateTasks } from '$hooks/queries/useTasks';
import { useInitialFocusRef } from '$hooks/ui/useInitialFocusRef';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import type { Tag, Task } from '$types';

type TagSelectionState = 'all' | 'some' | 'none';

interface BatchTaskTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  tags: Tag[];
}

const getTagSelectionState = (tasks: Task[], tagId: string): TagSelectionState => {
  const taggedCount = tasks.filter((task) => (task.tags ?? []).includes(tagId)).length;
  if (taggedCount === tasks.length) return 'all';
  if (taggedCount > 0) return 'some';
  return 'none';
};

export const BatchTaskTagsModal = ({ isOpen, onClose, tasks, tags }: BatchTaskTagsModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const batchUpdateTasksMutation = useBatchUpdateTasks();
  const resolveAccent = useAccentColorResolver();
  const resolvedAccentColor = useResolvedAccentColor();
  const searchInputRef = useInitialFocusRef<HTMLInputElement>();

  const filteredTags = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return tags;
    return tags.filter((tag) => tag.name.toLowerCase().includes(query));
  }, [searchQuery, tags]);

  const handleToggleTag = (tagId: string) => {
    const selectionState = getTagSelectionState(tasks, tagId);
    const shouldAddTag = selectionState !== 'all';
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

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Tags"
      description={`${tasks.length} selected ${tasks.length === 1 ? 'task' : 'tasks'}`}
      zIndex="z-60"
      className="max-w-sm"
      footer={
        <ModalButton variant="primary" onClick={onClose}>
          Done
        </ModalButton>
      }
    >
      {tags.length > 0 && (
        <div className="px-4 pt-3 pb-2 -mx-4 -mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className="w-full pl-9 pr-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
            />
          </div>
        </div>
      )}

      <div className="-mx-4 p-2 max-h-80 overflow-y-auto">
        {tags.length === 0 ? (
          <div className="px-3 py-2 text-sm text-surface-500 dark:text-surface-400">
            No tags available.
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="px-3 py-2 text-sm text-surface-500 dark:text-surface-400">
            No tags match your search.
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTags.map((tag) => {
              const selectionState = getTagSelectionState(tasks, tag.id);
              const Icon = getIconByName(tag.icon || 'tag');
              const tagColor = tag.color ? resolveAccent(tag.color) : resolvedAccentColor;
              return (
                <button
                  type="button"
                  key={tag.id}
                  aria-pressed={selectionState === 'some' ? 'mixed' : selectionState === 'all'}
                  onClick={() => handleToggleTag(tag.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                >
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
                </button>
              );
            })}
          </div>
        )}
      </div>
    </ModalWrapper>
  );
};
