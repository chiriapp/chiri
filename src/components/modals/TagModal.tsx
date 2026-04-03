import X from 'lucide-react/icons/x';
import { useState } from 'react';
import { ComposedInput } from '$components/ComposedInput';
import { IconEmojiPicker } from '$components/IconEmojiPicker';
import { ModalBackdrop } from '$components/ModalBackdrop';
import { COLOR_PRESETS, FALLBACK_ITEM_COLOR } from '$constants';
import { getIconByName } from '$constants/icons';
import { useCreateTag, useTags, useUpdateTag } from '$hooks/queries/useTags';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { useFocusTrap } from '$hooks/ui/useFocusTrap';
import { useModalEscapeKey } from '$hooks/ui/useModalEscapeKey';

interface TagModalProps {
  tagId: string | null;
  initialName?: string;
  onClose: () => void;
}

export const TagModal = ({ tagId, initialName, onClose }: TagModalProps) => {
  const { data: tags = [] } = useTags();
  const createTagMutation = useCreateTag();
  const updateTagMutation = useUpdateTag();
  const { defaultTagColor, accentColor } = useSettingsStore();

  const existingTag = tagId ? tags.find((t) => t.id === tagId) : null;

  const resolvedDefaultTagColor = defaultTagColor === 'accent' ? accentColor : defaultTagColor;
  const [name, setName] = useState(existingTag?.name || initialName || '');
  const [color, setColor] = useState(existingTag?.color ?? resolvedDefaultTagColor);
  const [icon, setIcon] = useState(existingTag?.icon || 'tag');
  const [emoji, setEmoji] = useState(existingTag?.emoji || '');
  const focusTrapRef = useFocusTrap();

  // handle ESC key to close modal
  useModalEscapeKey(onClose);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (existingTag) {
      updateTagMutation.mutate({ id: existingTag.id, updates: { name, color, icon, emoji } });
    } else {
      createTagMutation.mutate({ name, color, icon, emoji });
    }

    onClose();
  };

  const IconComponent = getIconByName(icon);

  return (
    <ModalBackdrop zIndex="z-[60]">
      <div
        ref={focusTrapRef}
        className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-sm animate-scale-in relative"
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">
            {existingTag ? 'Edit Tag' : 'New Tag'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
                ref={(el) => {
                  if (el) setTimeout(() => el.focus(), 100);
                }}
                id="tag-name"
                type="text"
                value={name}
                onChange={setName}
                placeholder="Tag name"
                required
                className="flex-1 px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
              />
            </div>
          </div>

          <div>
            <p className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Color
            </p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
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
                placeholder={FALLBACK_ITEM_COLOR}
                className="flex-1 px-3 py-2 text-sm font-mono text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
              />
            </div>
          </div>

          <div className="pt-2">
            <p className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Preview
            </p>
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border"
              style={{
                borderColor: color,
                backgroundColor: `${color}15`,
                color: color,
              }}
            >
              {emoji ? (
                <span className="text-sm leading-none">{emoji}</span>
              ) : (
                <IconComponent className="w-3.5 h-3.5" />
              )}
              {name || 'Tag name'}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-sm font-medium text-primary-contrast bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-600 outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-inset"
            >
              {existingTag ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </ModalBackdrop>
  );
};
