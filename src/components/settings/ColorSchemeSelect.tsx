import Check from 'lucide-react/icons/check';
import ChevronDown from 'lucide-react/icons/chevron-down';
import { type CSSProperties, type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { FloatingDropdownFrame } from '$components/FloatingDropdownFrame';
import { getColorSchemeFlavorDefaultAccentColor } from '$constants/colorSchemes';
import type { ColorSchemeFlavor } from '$types/color';
import { getColorSchemePreviewPalette } from '$utils/colorSchemePreview';

export interface ColorSchemeSelectOption {
  id: string;
  name: string;
  detail: string;
  modeLabel: string;
  flavor: ColorSchemeFlavor;
}

interface ColorSchemeSelectProps {
  label: string;
  value: string;
  options: ColorSchemeSelectOption[];
  onChange: (id: string) => void;
}

const getRowStyle = (
  option: ColorSchemeSelectOption,
  isSelected: boolean,
  isActive = false,
): CSSProperties => {
  const palette = getColorSchemePreviewPalette(option.flavor);
  const accent = getColorSchemeFlavorDefaultAccentColor(option.flavor);
  const activeBorder = option.flavor.mode === 'light' ? palette.muted : palette.text;

  return {
    backgroundColor: isActive ? palette.selected : palette.background,
    borderColor: isSelected ? accent : isActive ? activeBorder : palette.border,
    boxShadow: isSelected
      ? `0 0 0 1px ${accent}`
      : isActive
        ? `0 0 0 1px ${activeBorder}`
        : undefined,
    color: palette.text,
  };
};

const getTriggerStyle = (option: ColorSchemeSelectOption): CSSProperties => {
  const palette = getColorSchemePreviewPalette(option.flavor);

  return {
    backgroundColor: palette.background,
    color: palette.text,
  };
};

const AccentDots = ({ flavor, max = 5 }: { flavor: ColorSchemeFlavor; max?: number }) => {
  const palette = getColorSchemePreviewPalette(flavor);

  return (
    <span className="flex shrink-0 -space-x-1" aria-hidden="true">
      {flavor.accentColors.slice(0, max).map((color) => (
        <span
          className="h-3.5 w-3.5 rounded-full border"
          key={color.name}
          style={{ backgroundColor: color.value, borderColor: palette.background }}
        />
      ))}
    </span>
  );
};

const MiniAppSwatch = ({ flavor }: { flavor: ColorSchemeFlavor }) => {
  const palette = getColorSchemePreviewPalette(flavor);
  const accent = getColorSchemeFlavorDefaultAccentColor(flavor);

  return (
    <span
      className="flex h-9 w-14 shrink-0 overflow-hidden rounded-md border"
      style={{ backgroundColor: palette.background, borderColor: palette.border }}
      aria-hidden="true"
    >
      <span
        className="flex w-5 flex-col gap-1 border-r p-1"
        style={{ backgroundColor: palette.sidebar, borderColor: palette.border }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
        <span
          className="h-1 w-3 rounded-full opacity-70"
          style={{ backgroundColor: palette.text }}
        />
        <span
          className="h-1 w-2 rounded-full opacity-45"
          style={{ backgroundColor: palette.muted }}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 p-1">
        <span
          className="h-1.5 w-full rounded-full opacity-60"
          style={{ backgroundColor: palette.muted }}
        />
        <span
          className="h-2.5 w-full rounded-sm border"
          style={{ backgroundColor: palette.panel, borderColor: accent }}
        />
        <span
          className="h-2.5 w-4/5 rounded-sm border"
          style={{ backgroundColor: palette.panel, borderColor: palette.border }}
        />
      </span>
    </span>
  );
};

const OptionContent = ({
  option,
  isSelected,
  compact = false,
}: {
  option: ColorSchemeSelectOption;
  isSelected: boolean;
  compact?: boolean;
}) => {
  const palette = getColorSchemePreviewPalette(option.flavor);
  const accent = getColorSchemeFlavorDefaultAccentColor(option.flavor);

  return (
    <span className="flex min-w-0 items-center gap-3">
      <MiniAppSwatch flavor={option.flavor} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{option.name}</span>
        <span className="mt-0.5 block truncate text-xs" style={{ color: palette.muted }}>
          {option.detail}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <AccentDots flavor={option.flavor} max={compact ? 4 : 5} />
        <span
          className="rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
          style={{
            backgroundColor: palette.badge,
            borderColor: palette.border,
            color: palette.muted,
          }}
        >
          {option.modeLabel}
        </span>
        {isSelected && (
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: accent }}
          >
            <Check className="h-3.5 w-3.5" />
          </span>
        )}
      </span>
    </span>
  );
};

export const ColorSchemeSelect = ({ label, value, options, onChange }: ColorSchemeSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownWidth, setDropdownWidth] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const listboxId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(
    options.findIndex((option) => option.id === value),
    0,
  );
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    if (!isOpen || options.length === 0) return;

    const frame = window.requestAnimationFrame(() => {
      const activeOption = optionRefs.current[activeIndex];
      activeOption?.focus({ preventScroll: true });
      activeOption?.scrollIntoView({ block: 'nearest' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeIndex, isOpen, options.length]);

  if (!selectedOption) return null;

  const focusTrigger = () => {
    window.requestAnimationFrame(() => buttonRef.current?.focus());
  };

  const focusOption = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), options.length - 1);
    setActiveIndex(nextIndex);
  };

  const getWrappedIndex = (index: number) => (index + options.length) % options.length;

  const openDropdown = (index = selectedIndex) => {
    setDropdownWidth(buttonRef.current?.offsetWidth ?? null);
    focusOption(index);
    setIsOpen(true);
  };

  const closeDropdown = (restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) focusTrigger();
  };

  const selectOption = (option: ColorSchemeSelectOption) => {
    onChange(option.id);
    closeDropdown(true);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (options.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openDropdown(isOpen ? getWrappedIndex(activeIndex + 1) : selectedIndex);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      openDropdown(isOpen ? getWrappedIndex(activeIndex - 1) : selectedIndex);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isOpen) {
        selectOption(options[activeIndex] ?? selectedOption);
      } else {
        openDropdown(selectedIndex);
      }
      return;
    }

    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      closeDropdown();
    }
  };

  const handleListboxKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = Math.min(Math.max(activeIndex, 0), options.length - 1);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOption(getWrappedIndex(currentIndex + 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption(getWrappedIndex(currentIndex - 1));
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      focusOption(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      focusOption(options.length - 1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      selectOption(options[currentIndex] ?? selectedOption);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeDropdown(true);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        ref={buttonRef}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={`${label}: ${selectedOption.name}`}
        onClick={() => {
          if (isOpen) {
            closeDropdown();
          } else {
            openDropdown(selectedIndex);
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors outline-hidden hover:border-surface-300 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:hover:border-surface-600 ${
          isOpen
            ? 'border-surface-300 dark:border-surface-600'
            : 'border-surface-200 dark:border-surface-700'
        }`}
        style={getTriggerStyle(selectedOption)}
      >
        <span className="min-w-0 flex-1">
          <OptionContent option={selectedOption} isSelected={false} compact />
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
      </button>

      {isOpen && (
        <FloatingDropdownFrame
          anchorRef={buttonRef}
          onClose={() => closeDropdown()}
          align="end"
          fallbackWidth={dropdownWidth ?? 420}
          fallbackHeight={320}
          backdropClassName="fixed inset-0 z-70"
          dropdownClassName="z-80 max-h-80 overflow-y-auto p-1"
          dropdownStyle={dropdownWidth ? { width: dropdownWidth } : undefined}
          dataAttribute="data-context-menu-content"
        >
          <div
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="space-y-1"
            onKeyDown={handleListboxKeyDown}
          >
            {options.map((option, index) => {
              const isSelected = option.id === value;
              const isActive = activeIndex === index;

              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  key={option.id}
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  tabIndex={activeIndex === index ? 0 : -1}
                  onClick={() => {
                    selectOption(option);
                  }}
                  onFocus={() => setActiveIndex(index)}
                  className="w-full rounded-md border p-2 text-left transition-shadow outline-hidden hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                  style={getRowStyle(option, isSelected, isActive)}
                >
                  <OptionContent option={option} isSelected={isSelected} />
                </button>
              );
            })}
          </div>
        </FloatingDropdownFrame>
      )}
    </div>
  );
};
