import { useState } from 'react';
import { ComposedInput } from '$components/ComposedInput';
import { IconEmojiPicker } from '$components/IconEmojiPicker';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { getIconByName } from '$constants/icons';
import { useFilters, useUpdateFilter } from '$hooks/queries/useFilters';
import { useColorPresets } from '$hooks/ui/useColorPresets';
import { useInitialFocusRef } from '$hooks/ui/useInitialFocusRef';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';

interface FilterModalProps {
  filterId: string;
  onClose: () => void;
}

export const FilterModal = ({ filterId, onClose }: FilterModalProps) => {
  const { data: filters = [] } = useFilters();
  const updateFilterMutation = useUpdateFilter();
  const colorPresets = useColorPresets();
  const resolveAccentColor = useAccentColorResolver();
  const resolvedAccentColor = useResolvedAccentColor();
  const fallbackColor = colorPresets[0] ?? resolvedAccentColor;

  const existingFilter = filters.find((filter) => filter.id === filterId);
  const initialColor = resolveAccentColor(existingFilter?.color ?? resolvedAccentColor);

  const [name, setName] = useState(existingFilter?.name ?? '');
  const [color, setColor] = useState(initialColor);
  const [icon, setIcon] = useState(existingFilter?.icon ?? 'list-todo');
  const [emoji, setEmoji] = useState(existingFilter?.emoji ?? '');
  const nameInputRef = useInitialFocusRef<HTMLInputElement>();

  if (!existingFilter) return null;

  const IconComponent = getIconByName(icon);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateFilterMutation.mutate({
      id: existingFilter.id,
      updates: { name, color, icon, emoji, presetId: undefined },
    });
    onClose();
  };

  return (
    <ModalWrapper
      onClose={onClose}
      title="Edit Filter"
      size="sm"
      zIndex="z-60"
      contentPadding={false}
      footer={
        <>
          <ModalButton variant="ghost" onClick={onClose}>
            Cancel
          </ModalButton>
          <ModalButton type="submit" form="filter-form" disabled={!name.trim()}>
            Save
          </ModalButton>
        </>
      }
    >
      <form id="filter-form" onSubmit={handleSubmit} className="p-4 space-y-4">
        <div>
          <label
            htmlFor="filter-name"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
          >
            Filter Name
          </label>
          <div className="flex items-center gap-2">
            <IconEmojiPicker
              iconValue={icon}
              emojiValue={emoji}
              onIconChange={setIcon}
              onEmojiChange={setEmoji}
              color={color}
            />
            <ComposedInput
              ref={nameInputRef}
              id="filter-name"
              type="text"
              value={name}
              onChange={setName}
              placeholder="Filter name"
              required
              className="flex-1 px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
            />
          </div>
        </div>

        <div>
          <p className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            Color
          </p>
          <div className="flex flex-wrap gap-2">
            {colorPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setColor(preset)}
                className={`
                    w-8 h-8 rounded-full transition-all
                    ${color === preset ? 'ring-2 ring-offset-2 dark:ring-offset-surface-800 ring-primary-500 scale-110' : 'hover:scale-110'}
                  `}
                style={{ backgroundColor: preset }}
              />
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-700 flex items-center justify-center hover:border-surface-300 dark:hover:border-surface-500 transition-colors cursor-pointer [&::-webkit-color-swatch-wrapper]:p-2 [&::-webkit-color-swatch]:rounded-full"
            />
            <ComposedInput
              type="text"
              value={color}
              onChange={setColor}
              placeholder={fallbackColor}
              className="flex-1 px-3 py-2 text-sm font-mono text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
            />
          </div>
        </div>

        <div className="pt-2">
          <p className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            Preview
          </p>
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-medium border"
            style={{
              borderColor: color,
              backgroundColor: `${color}15`,
              color,
            }}
          >
            {emoji ? (
              <span className="text-sm leading-none">{emoji}</span>
            ) : (
              <IconComponent className="w-3.5 h-3.5" />
            )}
            {name || 'Filter name'}
          </span>
        </div>
      </form>
    </ModalWrapper>
  );
};
