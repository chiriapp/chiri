import { EmojiPicker } from 'frimousse';
import { useEffect, useRef, useState } from 'react';
import { CALENDAR_ICONS, getIconByName } from '$data/icons';
import { FALLBACK_ITEM_COLOR } from '$utils/constants';

interface IconEmojiPickerProps {
  iconValue: string;
  emojiValue?: string;
  onIconChange: (iconName: string) => void;
  onEmojiChange: (emoji: string) => void;
  color?: string;
}

export const IconEmojiPicker = ({
  iconValue,
  emojiValue = '',
  onIconChange,
  onEmojiChange,
  color = FALLBACK_ITEM_COLOR,
}: IconEmojiPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'icon' | 'emoji'>('icon');
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle Escape key to close dropdown (prevent modal from closing)
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Use capture phase to intercept before modal handlers
      window.addEventListener('keydown', handleEscape, { capture: true });
    }

    return () => {
      window.removeEventListener('keydown', handleEscape, { capture: true });
    };
  }, [isOpen]);

  const SelectedIcon = getIconByName(iconValue);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-lg border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-700 flex items-center justify-center hover:border-surface-300 dark:hover:border-surface-500 transition-colors cursor-pointer"
        style={{ color }}
      >
        {emojiValue ? (
          <span className="text-lg leading-none">{emojiValue}</span>
        ) : (
          <SelectedIcon className="w-5 h-5" />
        )}
      </button>

      {isOpen && (
        <div
          data-icon-emoji-picker-dropdown
          className="absolute z-50 mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg animate-scale-in w-[352px]"
        >
          <div className="flex border-b border-surface-200 dark:border-surface-700">
            <button
              type="button"
              onClick={() => setActiveTab('icon')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'icon'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200'
              }`}
            >
              Icon
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('emoji')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'emoji'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200'
              }`}
            >
              Emoji
            </button>
          </div>

          <div>
            {activeTab === 'icon' ? (
              <div className="p-2">
                <div className="h-[280px] overflow-y-auto px-1">
                  <div className="grid grid-cols-9 gap-1">
                    {CALENDAR_ICONS.map(({ name, icon: Icon }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          onIconChange(name);
                          onEmojiChange(''); // Clear emoji when selecting icon
                          setIsOpen(false);
                        }}
                        className={`
                          w-8 h-8 rounded flex items-center justify-center transition-colors cursor-pointer border
                          ${
                            iconValue === name && !emojiValue
                              ? 'bg-surface-100 dark:bg-surface-700'
                              : 'border-transparent text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'
                          }
                        `}
                        style={
                          iconValue === name && !emojiValue ? { borderColor: color } : undefined
                        }
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmojiPicker.Root
                className="w-full"
                onEmojiSelect={(emoji) => {
                  onEmojiChange(emoji.emoji);
                  setIsOpen(false);
                }}
                columns={9}
              >
                <div className="px-2 pt-2">
                  <EmojiPicker.Search className="w-full appearance-none rounded-md bg-surface-100 dark:bg-surface-700 px-2.5 py-2 text-sm text-surface-800 dark:text-surface-200 placeholder:text-surface-400 focus:outline-none" />
                </div>

                <EmojiPicker.Viewport className="outline-hidden h-[252px]">
                  <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-surface-400 text-sm dark:text-surface-500">
                    Loading…
                  </EmojiPicker.Loading>
                  <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-surface-400 text-sm dark:text-surface-500">
                    No emoji found
                  </EmojiPicker.Empty>
                  <EmojiPicker.List
                    className="select-none pb-1.5"
                    components={{
                      CategoryHeader: ({ category, ...props }) => (
                        <div
                          className="bg-white dark:bg-surface-800 px-3 pt-3 pb-1.5 font-medium text-surface-600 dark:text-surface-400 text-xs sticky top-0"
                          {...props}
                        >
                          {category.label}
                        </div>
                      ),
                      Row: ({ children, ...props }) => (
                        <div className="scroll-my-1.5 px-2" {...props}>
                          {children}
                        </div>
                      ),
                      Emoji: ({ emoji, ...props }) => (
                        <button
                          type="button"
                          className="flex flex-1 max-w-[calc(100%/9)] h-8 items-center justify-center rounded-lg text-lg data-[active]:bg-surface-100 dark:data-[active]:bg-surface-700"
                          {...props}
                          style={
                            emoji.emoji === emojiValue
                              ? {
                                  backgroundColor: `${color}20`,
                                  borderColor: color,
                                  borderWidth: '1px',
                                }
                              : undefined
                          }
                        >
                          {emoji.emoji}
                        </button>
                      ),
                    }}
                  />
                </EmojiPicker.Viewport>

                <div className="flex items-center gap-2 border-t border-surface-200 dark:border-surface-700 px-3 py-2 min-h-[34px]">
                  <EmojiPicker.ActiveEmoji>
                    {({ emoji }) =>
                      emoji ? (
                        <>
                          <span className="text-base leading-none">{emoji.emoji}</span>
                          <span className="text-xs text-surface-600 dark:text-surface-400 truncate">
                            {emoji.label}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-surface-400 dark:text-surface-500">
                          Hover to preview…
                        </span>
                      )
                    }
                  </EmojiPicker.ActiveEmoji>
                </div>
              </EmojiPicker.Root>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
