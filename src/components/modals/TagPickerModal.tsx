import Plus from 'lucide-react/icons/plus';
import Search from 'lucide-react/icons/search';
import { useMemo, useState } from 'react';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { getIconByName } from '$constants/icons';
import type { Tag } from '$types';

interface TagPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableTags: Tag[];
  onSelectTag: (tagId: string) => void;
  onCreateTag?: (name: string) => void;
  allTagsAssigned: boolean;
  noTagsExist: boolean;
  initialQuery?: string;
}

export const TagPickerModal = ({
  isOpen,
  onClose,
  availableTags,
  onSelectTag,
  onCreateTag,
  allTagsAssigned,
  noTagsExist,
  initialQuery = '',
}: TagPickerModalProps) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return availableTags;
    const lowerQuery = searchQuery.toLowerCase();
    return availableTags.filter((tag) => tag.name.toLowerCase().includes(lowerQuery));
  }, [availableTags, searchQuery]);

  if (!isOpen) return null;

  const handleSelectTag = (tagId: string) => {
    onSelectTag(tagId);
    onClose();
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Add Tag"
      zIndex="z-60"
      className="max-w-xs"
      footer={
        <ModalButton variant="secondary" onClick={onClose}>
          Cancel
        </ModalButton>
      }
    >
      {!noTagsExist && !allTagsAssigned && (
        <div className="px-4 pt-3 pb-2 -mx-4 -mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              ref={(el) => {
                if (el) setTimeout(() => el.focus(), 100);
              }}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags, or type to create..."
              className="w-full pl-9 pr-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
            />
          </div>
        </div>
      )}

      <div className="-mx-4 p-2 max-h-80 overflow-y-auto">
        {!noTagsExist && (
          <>
            {allTagsAssigned && (
              <div className="px-3 py-2 text-sm text-surface-500 dark:text-surface-400">
                All available tags have been assigned.
              </div>
            )}
            {!allTagsAssigned && filteredTags.length === 0 && (
              <div className="px-3 py-2 text-sm text-surface-500 dark:text-surface-400">
                No tags match your search.
              </div>
            )}
            {!allTagsAssigned && filteredTags.length > 0 && (
              <div className="space-y-1">
                {filteredTags.map((tag) => {
                  const TagIcon = getIconByName(tag.icon || 'tag');
                  return (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() => handleSelectTag(tag.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                    >
                      {tag.emoji ? (
                        <span className="text-xs leading-none" style={{ color: tag.color }}>
                          {tag.emoji}
                        </span>
                      ) : (
                        <TagIcon className="w-4 h-4" style={{ color: tag.color }} />
                      )}
                      <span className="text-surface-700 dark:text-surface-300">{tag.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {onCreateTag && filteredTags.length === 0 && !allTagsAssigned && (
              <button
                type="button"
                onClick={() => {
                  onCreateTag(searchQuery.trim());
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors text-surface-700 dark:text-surface-300 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                <Plus className="w-4 h-4 text-surface-400 shrink-0" />
                {searchQuery.trim() ? `Create tag "${searchQuery.trim()}"` : 'Create a new tag'}
              </button>
            )}
          </>
        )}
        {noTagsExist && onCreateTag && (
          <button
            type="button"
            onClick={() => {
              onCreateTag('');
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors text-surface-700 dark:text-surface-300 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <Plus className="w-4 h-4 text-surface-400 shrink-0" />
            Create a new tag
          </button>
        )}
      </div>
    </ModalWrapper>
  );
};
