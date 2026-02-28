import X from 'lucide-react/icons/x';
import { useEffect, useRef, useState } from 'react';
import { ComposedInput } from '@/components/ComposedInput';
import { useCreateTag, useTags, useUpdateTag } from '@/hooks/queries';
import { useModalEscapeKey } from '@/hooks/useModalEscapeKey';
import { COLOR_PRESETS, FALLBACK_ITEM_COLOR } from '@/utils/constants';
import { getIconByName, IconEmojiPicker } from '../IconEmojiPicker';

interface TagModalProps {
  tagId: string | null;
  onClose: () => void;
}

export function TagModal({ tagId, onClose }: TagModalProps) {
  const { data: tags = [] } = useTags();
  const createTagMutation = useCreateTag();
  const updateTagMutation = useUpdateTag();

  const existingTag = tagId ? tags.find((t) => t.id === tagId) : null;

  const [name, setName] = useState(existingTag?.name || '');
  const [color, setColor] = useState(existingTag?.color ?? FALLBACK_ITEM_COLOR);
  const [icon, setIcon] = useState(existingTag?.icon || 'tag');
  const [emoji, setEmoji] = useState(existingTag?.emoji || '');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // handle ESC key to close modal
  useModalEscapeKey(onClose);

  // Autofocus name input after modal is mounted and visible
  useEffect(() => {
    // Delay to ensure modal animation (150ms) has completed
    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 200);
    return () => clearTimeout(timer);
  }, []);

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
    // biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop does not require keyboard handler; ESC key closes modal via useModalEscapeKey hook
    // biome-ignore lint/a11y/useKeyWithClickEvents: Modal backdrop is non-interactive; users close with Escape or X button
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-sm animate-scale-in">
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
                ref={nameInputRef}
                id="tag-name"
                type="text"
                value={name}
                onChange={setName}
                placeholder="Tag name"
                required
                className="flex-1 px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/50"
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
                className="flex-1 px-3 py-2 text-sm font-mono text-surface-800 dark:text-surface-200 bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/50"
              />
            </div>
          </div>

          <div className="pt-2">
            <p className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Preview
            </p>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: `${color}20`,
                color: color,
              }}
            >
              {emoji ? (
                <span className="text-sm">{emoji}</span>
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
              className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-600"
            >
              {existingTag ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
