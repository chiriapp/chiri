import Plus from 'lucide-react/icons/plus';
import X from 'lucide-react/icons/x';
import { useState } from 'react';
import { TagPickerModal } from '$components/modals/TagPickerModal';
import { getIconByName } from '$data/icons';
import { useTags } from '$hooks/queries/useTags';
import { useSettingsStore } from '$hooks/useSettingsStore';
import { PRIORITIES } from '$utils/priority';

export const TaskDefaultsSettings = () => {
  const { defaultPriority, setDefaultPriority, defaultTags, setDefaultTags } = useSettingsStore();
  const { data: tags = [] } = useTags();
  const [showTagPicker, setShowTagPicker] = useState(false);

  const handleAddTag = (tagId: string) => {
    if (!defaultTags.includes(tagId)) {
      setDefaultTags([...defaultTags, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setDefaultTags(defaultTags.filter((id) => id !== tagId));
  };

  // Get selected tags and available tags
  const selectedTags = defaultTags.map((tagId) => tags.find((t) => t.id === tagId)).filter(Boolean);
  const availableTags = tags.filter((t) => !defaultTags.includes(t.id));

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200">
        Task Defaults
      </h3>
      <div className="rounded-lg border border-surface-200 dark:border-surface-700 p-4 bg-white dark:bg-surface-800">
        <h4 className="text-sm font-medium text-surface-800 dark:text-surface-200 mb-3">
          Default Priority
        </h4>
        <div className="flex gap-2">
          {PRIORITIES.map((p) => (
            <button
              type="button"
              key={p.value}
              onClick={() => setDefaultPriority(p.value)}
              className={`
                flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500
                ${
                  defaultPriority === p.value
                    ? `${p.borderColor} ${p.bgColor}`
                    : 'border-surface-200 dark:border-surface-600 hover:border-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400'
                }
              `}
            >
              <span className={p.color}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-surface-200 dark:border-surface-700 p-4 bg-white dark:bg-surface-800">
        <h4 className="text-sm font-medium text-surface-800 dark:text-surface-200 mb-3">
          Default Tags
        </h4>
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => {
            if (!tag) return null;
            const TagIcon = getIconByName(tag.icon || 'tag');
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
                  <span className="text-sm">{tag.emoji}</span>
                ) : (
                  <TagIcon className="w-3 h-3" />
                )}
                {tag.name}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          <button
            type="button"
            onClick={() => setShowTagPicker(true)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-surface-500 dark:text-surface-400 border border-dashed border-surface-300 dark:border-surface-600 rounded-full hover:border-surface-400 dark:hover:border-surface-500 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <Plus className="w-3 h-3" />
            Add tag
          </button>
        </div>
      </div>

      {/* Tag Picker Modal */}
      {showTagPicker && (
        <TagPickerModal
          isOpen={showTagPicker}
          onClose={() => setShowTagPicker(false)}
          availableTags={availableTags}
          onSelectTag={handleAddTag}
          allTagsAssigned={availableTags.length === 0 && tags.length > 0}
          noTagsExist={tags.length === 0}
        />
      )}
    </div>
  );
};
