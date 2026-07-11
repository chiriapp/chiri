import Ban from 'lucide-react/icons/ban';
import Check from 'lucide-react/icons/check';
import Plus from 'lucide-react/icons/plus';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import Timer from 'lucide-react/icons/timer';
import X from 'lucide-react/icons/x';
import { type CSSProperties, useState } from 'react';
import { BatchTaskTagsModal } from '$components/modals/BatchTaskTagsModal';
import { TaskDefaultSchedulingSettings } from '$components/settings/TaskDefaultsSettings/TaskDefaultSchedulingSettings';
import { TaskDefaultsColorPicker } from '$components/settings/TaskDefaultsSettings/TaskDefaultsColorPicker';
import { getIconByName } from '$constants/icons';
import { PRIORITIES } from '$constants/priority';
import { useSettingsStore } from '$context/settingsContext';
import { useTags } from '$hooks/queries/useTags';
import { useColorPresets } from '$hooks/ui/useColorPresets';
import { useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import type { TaskStatus } from '$types';

export const TaskDefaultsSettings = () => {
  const {
    defaultPriority,
    setDefaultPriority,
    defaultStatus,
    setDefaultStatus,
    defaultPercentComplete,
    setDefaultPercentComplete,
    defaultTags,
    setDefaultTags,
    defaultTagColor,
    setDefaultTagColor,
  } = useSettingsStore();
  const colorPresets = useColorPresets();
  const resolvedAccentColor = useResolvedAccentColor();
  const { data: tags = [] } = useTags();
  const [showTagsModal, setShowTagsModal] = useState(false);

  const handleRemoveTag = (tagId: string) => {
    setDefaultTags(defaultTags.filter((id) => id !== tagId));
  };

  const selectedTags = defaultTags.map((tagId) => tags.find((t) => t.id === tagId)).filter(Boolean);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">Defaults</h3>

      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">
          Task values
        </h4>
        <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
          <div className="p-4">
            <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">
              Status
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    value: 'needs-action',
                    label: 'Needs Action',
                    Icon: RotateCcw,
                    iconClass: 'text-status-needs-action',
                    activeClass:
                      'border-status-needs-action bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100',
                  },
                  {
                    value: 'in-process',
                    label: 'In Process',
                    Icon: Timer,
                    iconClass: 'text-status-in-process',
                    activeClass:
                      'border-status-in-process bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100',
                  },
                  {
                    value: 'completed',
                    label: 'Completed',
                    Icon: Check,
                    iconClass: 'text-status-completed',
                    activeClass:
                      'border-status-completed bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100',
                  },
                  {
                    value: 'cancelled',
                    label: 'Cancelled',
                    Icon: Ban,
                    iconClass: 'text-status-cancelled',
                    activeClass:
                      'border-status-cancelled bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100',
                  },
                ] as const
              ).map(({ value, label, Icon, iconClass, activeClass }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDefaultStatus(value as TaskStatus)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-medium text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                    defaultStatus === value
                      ? activeClass
                      : 'border-surface-200 text-surface-600 hover:border-surface-300 hover:bg-surface-50 dark:border-surface-600 dark:text-surface-400 dark:hover:bg-surface-700'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${defaultStatus === value ? iconClass : ''}`}
                  />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-surface-200 border-t dark:border-surface-700" />

          <div className="p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-medium text-surface-500 text-xs dark:text-surface-400">Progress</p>
              <span className="font-medium text-surface-600 text-xs dark:text-surface-400">
                {defaultPercentComplete}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={defaultPercentComplete}
              style={{ '--pct': `${defaultPercentComplete}%` } as CSSProperties}
              onChange={(e) => setDefaultPercentComplete(Number(e.target.value))}
              className="w-full"
            />
            <div className="mt-1 flex justify-between">
              <span className="text-surface-400 text-xs">0%</span>
              <span className="text-surface-400 text-xs">100%</span>
            </div>
          </div>

          <div className="border-surface-200 border-t dark:border-surface-700" />

          <div className="p-4">
            <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">
              Priority
            </p>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p.value}
                  onClick={() => setDefaultPriority(p.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 font-medium text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                    defaultPriority === p.value
                      ? `${p.borderColor} bg-surface-200 text-surface-900 dark:bg-surface-700 dark:text-surface-100`
                      : 'border-surface-200 text-surface-600 hover:border-surface-300 hover:bg-surface-50 dark:border-surface-600 dark:text-surface-400 dark:hover:bg-surface-700'
                  }`}
                >
                  <span className={p.color}>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <TaskDefaultSchedulingSettings />

      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">Tags</h4>
        <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
          <div className="p-4">
            <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">
              Default tags
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
