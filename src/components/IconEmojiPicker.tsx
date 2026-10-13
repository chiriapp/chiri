import { EmojiPicker } from 'frimousse';
import Flag from 'lucide-react/icons/flag';
import Gamepad2 from 'lucide-react/icons/gamepad-2';
import Lightbulb from 'lucide-react/icons/lightbulb';
import PawPrint from 'lucide-react/icons/paw-print';
import Plane from 'lucide-react/icons/plane';
import Search from 'lucide-react/icons/search';
import Shapes from 'lucide-react/icons/shapes';
import Smile from 'lucide-react/icons/smile';
import UserRound from 'lucide-react/icons/user-round';
import Utensils from 'lucide-react/icons/utensils';
import { type UIEvent, useCallback, useEffect, useRef, useState } from 'react';
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

const EMOJI_CATEGORIES = [
  { label: 'Smileys & Emotion', icon: Smile },
  { label: 'People & Body', icon: UserRound },
  { label: 'Animals & Nature', icon: PawPrint },
  { label: 'Food & Drink', icon: Utensils },
  { label: 'Travel & Places', icon: Plane },
  { label: 'Activities', icon: Gamepad2 },
  { label: 'Objects', icon: Lightbulb },
  { label: 'Symbols', icon: Shapes },
  { label: 'Flags', icon: Flag },
] as const;

const normalizeEmojiCategoryLabel = (label: string) => label.toLowerCase();

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
  const [emojiSearch, setEmojiSearch] = useState('');
  const [pendingEmojiCategory, setPendingEmojiCategory] = useState<{
    label: string;
    previousRowCount: number | null;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiViewportRef = useRef<HTMLDivElement>(null);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<string>(EMOJI_CATEGORIES[0].label);

  const SelectedIcon = getIconByName(iconValue);

  const filteredIcons = iconSearch.trim()
    ? CALENDAR_ICONS.filter(({ name }) => name.toLowerCase().includes(iconSearch.toLowerCase()))
    : CALENDAR_ICONS;
  const isEmojiSearching = emojiSearch.trim().length > 0;

  const scrollToEmojiCategory = useCallback((label: string) => {
    const categoryHeaders =
      emojiPickerRef.current?.querySelectorAll<HTMLElement>('[data-emoji-category]');
    const header = [...(categoryHeaders ?? [])].find((element) => {
      const category = element.closest<HTMLElement>('[frimousse-category]');
      return (
        normalizeEmojiCategoryLabel(element.dataset.emojiCategory ?? '') ===
          normalizeEmojiCategoryLabel(label) && category?.style.top
      );
    });
    const category = header?.closest<HTMLElement>('[frimousse-category]');
    const viewport = emojiViewportRef.current;

    if (!category || !viewport) {
      return;
    }

    setActiveEmojiCategory(label);
    const top =
      category.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top +
      viewport.scrollTop;
    viewport.scrollTo({ top, behavior: 'instant' });
  }, []);

  const handleEmojiCategoryClick = (label: string) => {
    if (emojiSearch.trim()) {
      const rowCountAttribute = emojiPickerRef.current
        ?.querySelector('[frimousse-list]')
        ?.getAttribute('aria-rowcount');
      const rowCount =
        rowCountAttribute === null || rowCountAttribute === undefined
          ? null
          : Number(rowCountAttribute);

      setActiveEmojiCategory(label);
      setPendingEmojiCategory({
        label,
        previousRowCount: rowCount !== null && Number.isFinite(rowCount) ? rowCount : null,
      });
      setEmojiSearch('');
      return;
    }

    setPendingEmojiCategory(null);
    scrollToEmojiCategory(label);
  };

  useEffect(() => {
    if (!isOpen || emojiSearch.trim() || !pendingEmojiCategory) {
      return;
    }

    const picker = emojiPickerRef.current;
    if (!picker) {
      return;
    }

    let didNavigate = false;
    let observer: MutationObserver | undefined;
    let timeoutId = 0;
    const navigateWhenReady = (force = false) => {
      if (didNavigate) {
        return;
      }

      const rowCountAttribute = picker
        .querySelector('[frimousse-list]')
        ?.getAttribute('aria-rowcount');
      const rowCount =
        rowCountAttribute === null || rowCountAttribute === undefined
          ? null
          : Number(rowCountAttribute);
      const previousRowCount = pendingEmojiCategory.previousRowCount;
      const searchResultsUpdated =
        previousRowCount === null
          ? rowCount !== null
          : rowCount !== null && Number.isFinite(rowCount) && rowCount > previousRowCount;

      if (!searchResultsUpdated && !force) {
        return;
      }

      didNavigate = true;
      setPendingEmojiCategory(null);
      scrollToEmojiCategory(pendingEmojiCategory.label);
      observer?.disconnect();
      window.clearTimeout(timeoutId);
    };

    timeoutId = window.setTimeout(() => navigateWhenReady(true), 500);
    observer = new MutationObserver(() => navigateWhenReady());
    observer.observe(picker, {
      attributes: true,
      attributeFilter: ['aria-rowcount'],
      childList: true,
      subtree: true,
    });
    navigateWhenReady();

    return () => {
      observer?.disconnect();
      window.clearTimeout(timeoutId);
    };
  }, [emojiSearch, isOpen, pendingEmojiCategory, scrollToEmojiCategory]);

  const handleEmojiViewportScroll = (event: UIEvent<HTMLDivElement>) => {
    if (isEmojiSearching) {
      return;
    }

    const categoryHeaders =
      emojiPickerRef.current?.querySelectorAll<HTMLElement>('[data-emoji-category]');
    let currentCategory: string | undefined;
    let lastCategory: string | undefined;
    const viewportTop = event.currentTarget.getBoundingClientRect().top;

    for (const header of categoryHeaders ?? []) {
      const category = header.closest<HTMLElement>('[frimousse-category]');
      if (!category?.style.top) {
        continue;
      }

      currentCategory ??= header.dataset.emojiCategory;
      lastCategory = header.dataset.emojiCategory;
      const categoryTop =
        category.getBoundingClientRect().top - viewportTop + event.currentTarget.scrollTop;
      if (categoryTop > event.currentTarget.scrollTop + 1) {
        break;
      }

      currentCategory = header.dataset.emojiCategory;
    }

    if (
      event.currentTarget.scrollTop + event.currentTarget.clientHeight >=
      event.currentTarget.scrollHeight - 1
    ) {
      currentCategory = lastCategory ?? currentCategory;
    }

    if (currentCategory) {
      setActiveEmojiCategory(currentCategory);
    }
  };

  const dropdown = (
    <FloatingDropdownFrame
      anchorRef={triggerRef}
      onClose={() => setIsOpen(false)}
      align="start"
      gap={PICKER_GAP}
      fallbackWidth={FALLBACK_PICKER_WIDTH}
      fallbackHeight={FALLBACK_PICKER_HEIGHT}
      backdropClassName="fixed inset-0 z-70"
      dropdownClassName="z-80 w-88"
      dataAttribute="data-icon-emoji-picker-dropdown"
    >
      <div className="flex border-surface-200 border-b dark:border-surface-700">
        <button
          type="button"
          onClick={() => setActiveTab('icon')}
          className={`flex-1 px-4 py-2 font-medium text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset ${
            activeTab === 'icon'
              ? 'border-primary-ink border-b-2 text-primary-ink'
              : 'text-surface-600 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200'
          }`}
        >
          Icon
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('emoji')}
          className={`flex-1 px-4 py-2 font-medium text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset ${
            activeTab === 'emoji'
              ? 'border-primary-ink border-b-2 text-primary-ink'
              : 'text-surface-600 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200'
          }`}
        >
          Emoji
        </button>
      </div>

      <div className="relative">
        <div
          className={
            activeTab === 'icon'
              ? 'relative z-10'
              : 'pointer-events-none invisible absolute inset-x-0 top-0 z-0 opacity-0'
          }
        >
          <div className="px-2 pt-2">
            <div className="relative z-10">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder="Search..."
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                className="w-full appearance-none rounded-md border border-transparent bg-surface-100 py-2 pr-2.5 pl-8 text-sm text-surface-800 transition-colors placeholder:text-surface-400 focus:border-primary-ink focus:bg-white focus:outline-hidden dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
              />
            </div>
          </div>
          <div className="h-71.5 overflow-y-auto">
            {filteredIcons.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-surface-400 dark:text-surface-500">
                No icons found
              </div>
            ) : (
              <>
                <div className="px-3 pt-3 pb-1.5 font-medium text-surface-600 text-xs dark:text-surface-400">
                  All
                </div>
                <div className="grid grid-cols-9 px-2 pb-1.5">
                  {filteredIcons.map(({ name, icon: Icon }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        onIconChange(name);
                        onEmojiChange(''); // clear emoji when selecting icon
                        setIsOpen(false);
                      }}
                      className="flex h-8 w-full cursor-pointer items-center justify-center rounded-lg text-surface-600 outline-hidden transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-700"
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div
          className={
            activeTab === 'emoji'
              ? 'relative z-10'
              : 'pointer-events-none invisible absolute inset-x-0 top-0 z-0 opacity-0'
          }
        >
          <EmojiPicker.Root
            ref={emojiPickerRef}
            className="w-full"
            onEmojiSelect={(emoji) => {
              onEmojiChange(emoji.emoji);
              setIsOpen(false);
            }}
            columns={9}
          >
            <div className="px-2 pt-2">
              <div className="relative z-10">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
                <EmojiPicker.Search
                  placeholder="Search..."
                  value={emojiSearch}
                  onChange={(event) => {
                    setEmojiSearch(event.target.value);
                    if (event.target.value.trim()) {
                      setPendingEmojiCategory(null);
                    } else if (!pendingEmojiCategory) {
                      setActiveEmojiCategory(EMOJI_CATEGORIES[0].label);
                    }
                  }}
                  className="w-full appearance-none rounded-md border border-transparent bg-surface-100 py-2 pr-2.5 pl-8 text-sm text-surface-800 transition-colors placeholder:text-surface-400 focus:border-primary-ink focus:bg-white focus:outline-hidden dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
                />
              </div>
            </div>

            <nav
              aria-label="Emoji categories"
              className="mt-2 grid grid-cols-9 gap-0.5 border-surface-200 border-b px-2 pb-1 dark:border-surface-700"
            >
              {EMOJI_CATEGORIES.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={
                    !isEmojiSearching &&
                    normalizeEmojiCategoryLabel(activeEmojiCategory) ===
                      normalizeEmojiCategoryLabel(label)
                  }
                  onClick={() => handleEmojiCategoryClick(label)}
                  className={`flex h-7 w-full items-center justify-center rounded-md outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset ${
                    !isEmojiSearching &&
                    normalizeEmojiCategoryLabel(activeEmojiCategory) ===
                      normalizeEmojiCategoryLabel(label)
                      ? 'bg-surface-100 text-primary-ink dark:bg-surface-700'
                      : 'text-surface-500 hover:bg-surface-100 hover:text-surface-800 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </nav>

            <EmojiPicker.Viewport
              ref={emojiViewportRef}
              onScroll={handleEmojiViewportScroll}
              className="h-63 outline-hidden"
            >
              <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-sm text-surface-400 dark:text-surface-500">
                Loading…
              </EmojiPicker.Loading>
              <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-surface-400 dark:text-surface-500">
                No emoji found
              </EmojiPicker.Empty>
              <EmojiPicker.List
                className="select-none pb-1.5"
                components={{
                  CategoryHeader: ({ category, ...props }) => (
                    <div
                      data-emoji-category={category.label}
                      className="sticky top-0 bg-white px-3 pt-3 pb-1.5 font-medium text-surface-600 text-xs dark:bg-surface-800 dark:text-surface-400"
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
                      className="flex h-8 max-w-1/9 flex-1 items-center justify-center rounded-lg text-lg outline-hidden hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:hover:bg-surface-700"
                      {...props}
                    >
                      {emoji.emoji}
                    </button>
                  ),
                }}
              />
            </EmojiPicker.Viewport>

            <div className="flex min-h-8.5 items-center gap-2 border-surface-200 border-t px-3 py-2 dark:border-surface-700">
              <EmojiPicker.ActiveEmoji>
                {({ emoji }) =>
                  emoji ? (
                    <>
                      <span className="text-base leading-none">{emoji.emoji}</span>
                      <span className="truncate text-surface-600 text-xs dark:text-surface-400">
                        {emoji.label}
                      </span>
                    </>
                  ) : (
                    <span className="text-surface-400 text-xs dark:text-surface-500">
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
        onClick={() => {
          if (!isOpen) {
            setActiveEmojiCategory(EMOJI_CATEGORIES[0].label);
            setEmojiSearch('');
            setPendingEmojiCategory(null);
          }
          setIsOpen(!isOpen);
        }}
        aria-expanded={isOpen}
        className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border text-surface-600 outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink dark:text-surface-300 ${
          isOpen
            ? 'border-primary-ink bg-primary-500/10 ring-2 ring-primary-ink/30 dark:bg-primary-500/15'
            : 'border-surface-200 bg-surface-50 hover:border-surface-300 dark:border-surface-600 dark:bg-surface-700 dark:hover:border-surface-500'
        }`}
        style={color ? { color } : undefined}
      >
        {emojiValue ? (
          <span className="text-lg leading-none">{emojiValue}</span>
        ) : (
          <SelectedIcon className="h-5 w-5" />
        )}
      </button>

      {isOpen && dropdown}
    </div>
  );
};
