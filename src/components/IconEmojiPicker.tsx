import { EmojiPicker } from 'frimousse';
import { Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { FloatingDropdownFrame } from '$components/FloatingDropdownFrame';
import { CALENDAR_ICONS, getIconByName } from '$constants/icons';

interface IconEmojiPickerProps {
  iconValue: string;
  emojiValue?: string;
  onIconChange: (iconName: string) => void;
  onEmojiChange: (emoji: string) => void;
  color?: string;
}

const PICKER_GAP = 6;
const FALLBACK_PICKER_WIDTH = 352;
const FALLBACK_PICKER_HEIGHT = 380;

export const IconEmojiPicker = ({
  iconValue,
  emojiValue = '',
  onIconChange,
  onEmojiChange,
  color,
}: IconEmojiPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'icon' | 'emoji'>('icon');
  const [iconSearch, setIconSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);

  const SelectedIcon = getIconByName(iconValue);

  const filteredIcons = iconSearch.trim()
    ? CALENDAR_ICONS.filter(({ name }) => name.toLowerCase().includes(iconSearch.toLowerCase()))
    : CALENDAR_ICONS;

  const dropdown = (
    <FloatingDropdownFrame
      anchorRef={triggerRef}
      onClose={() => setIsOpen(false)}
      align="start"
      gap={PICKER_GAP}
      fallbackWidth={FALLBACK_PICKER_WIDTH}
      fallbackHeight={FALLBACK_PICKER_HEIGHT}
      backdropClassName="fixed inset-0 z-60"
      dropdownClassName="z-70 w-88"
      dataAttribute="data-icon-emoji-picker-dropdown"
    >
      <div className="flex border-b border-surface-200 dark:border-surface-700">
        <button
          type="button"
          onClick={() => setActiveTab('icon')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
            activeTab === 'icon'
              ? 'text-primary-500 border-b-2 border-primary-500'
              : 'text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200'
          }`}
        >
          Icon
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('emoji')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
            activeTab === 'emoji'
              ? 'text-primary-500 border-b-2 border-primary-500'
              : 'text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200'
          }`}
        >
          Emoji
        </button>
      </div>

      <div>
        <div className={activeTab === 'icon' ? '' : 'hidden'}>
          <div className="px-2 pt-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search..."
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                className="w-full appearance-none rounded-md bg-surface-100 dark:bg-surface-700 pl-8 pr-2.5 py-2 text-sm text-surface-800 dark:text-surface-200 placeholder:text-surface-400 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
              />
            </div>
          </div>
          <div className="h-71.5 overflow-y-auto">
            {filteredIcons.length === 0 ? (
              <div className="flex items-center justify-center h-full text-surface-400 dark:text-surface-500 text-sm">
                No icons found
              </div>
            ) : (
              <>
                <div className="px-3 pt-3 pb-1.5 font-medium text-surface-600 dark:text-surface-400 text-xs">
                  All
                </div>
                <div className="grid grid-cols-9 px-2 pb-1.5">
                  {filteredIcons.map(({ name, icon: Icon }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        onIconChange(name);
                        onEmojiChange(''); // Clear emoji when selecting icon
                        setIsOpen(false);
                      }}
                      className="w-full h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className={activeTab === 'emoji' ? '' : 'hidden'}>
          <EmojiPicker.Root
            className="w-full"
            onEmojiSelect={(emoji) => {
              onEmojiChange(emoji.emoji);
              setIsOpen(false);
            }}
            columns={9}
          >
            <div className="px-2 pt-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400 pointer-events-none" />
                <EmojiPicker.Search
                  placeholder="Search..."
                  className="w-full appearance-none rounded-md bg-surface-100 dark:bg-surface-700 pl-8 pr-2.5 py-2 text-sm text-surface-800 dark:text-surface-200 placeholder:text-surface-400 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
                />
              </div>
            </div>

            <EmojiPicker.Viewport className="outline-hidden h-63">
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
                      className="flex flex-1 max-w-1/9 h-8 items-center justify-center rounded-lg text-lg hover:bg-surface-100 dark:hover:bg-surface-700 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                      {...props}
                    >
                      {emoji.emoji}
                    </button>
                  ),
                }}
              />
            </EmojiPicker.Viewport>

            <div className="flex items-center gap-2 border-t border-surface-200 dark:border-surface-700 px-3 py-2 min-h-8.5">
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
        </div>
      </div>
    </FloatingDropdownFrame>
  );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={`w-10 h-10 rounded-lg border flex items-center justify-center text-surface-600 dark:text-surface-300 transition-colors cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 ${
          isOpen
            ? 'border-primary-500 bg-primary-500/10 dark:bg-primary-500/15 ring-2 ring-primary-500/30'
            : 'border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-700 hover:border-surface-300 dark:hover:border-surface-500'
        }`}
        style={color ? { color } : undefined}
      >
        {emojiValue ? (
          <span className="text-lg leading-none">{emojiValue}</span>
        ) : (
          <SelectedIcon className="w-5 h-5" />
        )}
      </button>

      {isOpen && dropdown}
    </div>
  );
};
