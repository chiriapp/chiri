import { useState } from 'react';
import { ColorSwatchPicker } from '$components/ColorSwatchPicker';
import { ComposedInput } from '$components/ComposedInput';
import { IconEmojiPicker } from '$components/IconEmojiPicker';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { useSettingsStore } from '$context/settingsContext';
import { useCreateTag, useTags, useUpdateTag } from '$hooks/queries/useTags';
import { useColorPresets } from '$hooks/ui/useColorPresets';
import { useInitialFocusRef } from '$hooks/ui/useInitialFocusRef';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import type { Tag } from '$types';

interface TagModalProps {
  tagId: string | null;
  initialName?: string;
  onClose: () => void;
  onSave?: (tag: Tag) => void;
}

export const TagModal = ({ tagId, initialName, onClose, onSave }: TagModalProps) => {
  const { data: tags = [] } = useTags();
  const createTagMutation = useCreateTag();
  const updateTagMutation = useUpdateTag();
  const { defaultTagColor } = useSettingsStore();
  const colorPresets = useColorPresets();
  const resolveAccentColor = useAccentColorResolver();
  const resolvedAccentColor = useResolvedAccentColor();

  const existingTag = tagId ? tags.find((t) => t.id === tagId) : null;

  const resolvedDefaultTagColor =
    defaultTagColor === 'accent' ? resolvedAccentColor : resolveAccentColor(defaultTagColor);
  const initialColor = resolveAccentColor(existingTag?.color ?? resolvedDefaultTagColor);
  const [name, setName] = useState(existingTag?.name || initialName || '');
  const [color, setColor] = useState(initialColor);
  const [icon, setIcon] = useState(existingTag?.icon || 'tag');
  const [emoji, setEmoji] = useState(existingTag?.emoji || '');
  const nameInputRef = useInitialFocusRef<HTMLInputElement>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const handleSave = (tag: Tag | undefined) => {
      if (tag) {
        onSave?.(tag);
      }
      onClose();
    };

    if (existingTag) {
      updateTagMutation.mutate(
        { id: existingTag.id, updates: { name, color, icon, emoji } },
        { onSuccess: handleSave },
      );
    } else {
      createTagMutation.mutate({ name, color, icon, emoji }, { onSuccess: handleSave });
    }
  };

  return (
    <ModalWrapper
      onClose={onClose}
      title={existingTag ? 'Edit Tag' : 'New Tag'}
      size="md"
      className="max-w-120"
      zIndex="z-60"
      contentPadding={false}
      footer={
        <>
          <ModalButton variant="ghost" onClick={onClose}>
            Cancel
          </ModalButton>
          <ModalButton type="submit" form="tag-form" disabled={!name.trim()}>
            {existingTag ? 'Save' : 'Create'}
          </ModalButton>
        </>
      }
    >
      <form id="tag-form" onSubmit={handleSubmit} className="p-4 space-y-4">
        <div>
          <label
            htmlFor="tag-name"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
          >
            Tag Name
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
              id="tag-name"
              type="text"
              value={name}
              onChange={setName}
              placeholder="Tag name"
              required
              className="flex-1 px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
            />
          </div>
        </div>

        <div>
          <p className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            Color
          </p>
          <ColorSwatchPicker
            options={colorPresets.map((preset) => ({
              id: preset,
              value: preset,
              label: preset,
            }))}
            value={color}
            colorInputValue={color}
            onSelect={setColor}
            onCustomChange={setColor}
          />
        </div>
      </form>
    </ModalWrapper>
  );
};
