import { ModalWrapper } from '$components/ModalWrapper';
import { FILTER_PRESET_DEFINITIONS } from '$constants/filters';
import { getIconByName } from '$constants/icons';
import { useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import type { FilterPresetDefinition } from '$types/filter';

const PRESET_CATEGORY_ORDER = [
  { id: 'date', label: 'Date' },
  { id: 'status', label: 'Status' },
  { id: 'priority', label: 'Priority' },
  { id: 'organization', label: 'Organization' },
] as const;

interface FilterPresetModalProps {
  existingPresetIds: Set<string>;
  onCreatePreset: (preset: FilterPresetDefinition) => void;
  onClose: () => void;
}

export const FilterPresetModal = ({
  existingPresetIds,
  onCreatePreset,
  onClose,
}: FilterPresetModalProps) => {
  const accentColor = useResolvedAccentColor();

  return (
    <ModalWrapper
      onClose={onClose}
      title="New Filter"
      size="sm"
      zIndex="z-60"
      contentPadding={false}
      contentOverflow="auto"
    >
      <div className="space-y-3 p-2">
        {PRESET_CATEGORY_ORDER.map((category) => {
          const presets = FILTER_PRESET_DEFINITIONS.filter(
            (preset) => preset.category === category.id,
          );
          if (presets.length === 0) return null;

          return (
            <section key={category.id} aria-labelledby={`filter-category-${category.id}`}>
              <h3
                id={`filter-category-${category.id}`}
                className="px-3 pb-1 font-semibold text-surface-500 text-xs uppercase tracking-wide dark:text-surface-400"
              >
                {category.label}
              </h3>
              {presets.map((preset) => {
                const PresetIcon = getIconByName(preset.icon ?? 'list-todo');
                const isAlreadyAdded = existingPresetIds.has(preset.presetId);

                return (
                  <button
                    key={preset.presetId}
                    type="button"
                    disabled={isAlreadyAdded}
                    onClick={() => {
                      if (isAlreadyAdded) return;
                      onCreatePreset(preset);
                      onClose();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset disabled:cursor-not-allowed disabled:text-surface-400 disabled:hover:bg-transparent dark:text-surface-300 dark:disabled:text-surface-500 dark:hover:bg-surface-700 dark:disabled:hover:bg-transparent"
                  >
                    <PresetIcon className="size-4 shrink-0" style={{ color: accentColor }} />
                    <span className="min-w-0 flex-1 truncate">{preset.name}</span>
                    {isAlreadyAdded && <span className="text-surface-500 text-xs">Added</span>}
                  </button>
                );
              })}
            </section>
          );
        })}
      </div>
    </ModalWrapper>
  );
};
