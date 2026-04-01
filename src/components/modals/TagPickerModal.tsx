import Plus from 'lucide-react/icons/plus';
import Search from 'lucide-react/icons/search';
import X from 'lucide-react/icons/x';
import { useMemo, useState } from 'react';
import { getIconByName } from '$constants/icons';
import { useFocusTrap } from '$hooks/ui/useFocusTrap';
import { useModalEscapeKey } from '$hooks/ui/useModalEscapeKey';
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
  const focusTrapRef = useFocusTrap(isOpen);

  // Handle ESC key to close modal
  useModalEscapeKey(onClose);

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
    // biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop does not require keyboard handler; ESC key closes modal via useModalEscapeKey hook
    // biome-ignore lint/a11y/useKeyWithClickEvents: Modal backdrop is non-interactive; users close with Escape or X button
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={focusTrapRef}
        className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-xs animate-scale-in"
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">Add Tag</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!noTagsExist && !allTagsAssigned && (
          <div className="px-4 pt-3 pb-2">
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
                className="w-full pl-9 pr-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
              />
            </div>
          </div>
        )}

        <div className="p-2 max-h-80 overflow-y-auto">
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
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
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
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors text-surface-700 dark:text-surface-300"
                >
                  <Plus className="w-4 h-4 text-surface-400 flex-shrink-0" />
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
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors text-surface-700 dark:text-surface-300"
            >
              <Plus className="w-4 h-4 text-surface-400 flex-shrink-0" />
              Create a new tag
            </button>
          )}
        </div>

        <div className="flex justify-end p-3 border-t border-surface-200 dark:border-surface-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
