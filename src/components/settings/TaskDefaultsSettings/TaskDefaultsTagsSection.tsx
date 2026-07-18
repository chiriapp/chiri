import Plus from 'lucide-react/icons/plus';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import X from 'lucide-react/icons/x';
import { useState } from 'react';
import { BatchTaskTagsModal } from '$components/modals/BatchTaskTagsModal';
import { TaskDefaultsColorPicker } from '$components/settings/TaskDefaultsSettings/TaskDefaultsColorPicker';
import { getIconByName } from '$constants/icons';
import { useSettingsStore } from '$context/settingsContext';
import { defaultState } from '$context/settingsDefaults';
import { useTags } from '$hooks/queries/useTags';
import { useColorPresets } from '$hooks/ui/useColorPresets';
import { useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';

export const TaskDefaultsTagsSection = () => {
  const { defaultTags, setDefaultTags, defaultTagColor, setDefaultTagColor } = useSettingsStore();
  const colorPresets = useColorPresets();
  const resolvedAccentColor = useResolvedAccentColor();
  const { data: tags = [] } = useTags();
  const [showTagsModal, setShowTagsModal] = useState(false);

  const handleRemoveTag = (tagId: string) => {
    setDefaultTags(defaultTags.filter((id) => id !== tagId));
  };

  const selectedTags = defaultTags.map((tagId) => tags.find((t) => t.id === tagId)).filter(Boolean);

  const handleReset = () => {
    setDefaultTags(defaultState.defaultTags);
    setDefaultTagColor(defaultState.defaultTagColor);
  };

  const hasChanged =
    defaultTags.length !== defaultState.defaultTags.length ||
    !defaultTags.every((tag) => defaultState.defaultTags.includes(tag)) ||
    defaultTagColor !== defaultState.defaultTagColor;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">Tags</h4>
        {hasChanged && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-surface-500 text-xs outline-hidden transition-colors hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="p-4">
          <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">
            Default tags for new tasks
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {selectedTags.map((tag) => {
              if (!tag) return null;
              const TagIcon = getIconByName(tag.icon || 'tag');
              return (
                <span
                  key={tag.id}
                  className="group inline-flex items-center gap-1.5 rounded-sm border py-1 pr-1 pl-2 font-medium text-xs leading-none"
                  style={{
                    borderColor: tag.color,
                    backgroundColor: `${tag.color}15`,
                    color: tag.color,
                  }}
                >
                  {tag.emoji ? (
                    <span className="text-sm">{tag.emoji}</span>
                  ) : (
                    <TagIcon className="h-3 w-3" />
                  )}
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag.id)}
                    className="rounded-full p-0.5 outline-hidden transition-colors hover:bg-black/10 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:hover:bg-white/10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              onClick={() => setShowTagsModal(true)}
              className="inline-flex items-center gap-1 rounded-sm border border-surface-200 bg-surface-50 px-2.5 py-1.5 text-surface-500 text-xs leading-none outline-hidden transition-colors hover:border-surface-400 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:border-surface-600 dark:bg-surface-800 dark:text-surface-400 dark:hover:border-surface-500"
            >
              <Plus className="h-3 w-3" />
              Add tag
            </button>
          </div>
        </div>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <TaskDefaultsColorPicker
          label="Default tag color"
          value={defaultTagColor}
          onChange={setDefaultTagColor}
          presets={colorPresets}
          accentColor={resolvedAccentColor}
        />
      </div>

      {showTagsModal && (
        <BatchTaskTagsModal
          isOpen={showTagsModal}
          onClose={() => setShowTagsModal(false)}
          tags={tags}
          selectedTagIds={defaultTags}
          onSelectedTagIdsChange={setDefaultTags}
          title="Default Tags"
          description="Applied to new tasks"
        />
      )}
    </div>
  );
};
