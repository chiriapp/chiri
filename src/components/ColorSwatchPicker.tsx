export interface ColorSwatchPickerOption {
  id: string;
  value: string;
  label: string;
}

interface ColorSwatchPickerProps {
  options: readonly ColorSwatchPickerOption[];
  value: string;
  colorInputValue: string;
  onSelect: (value: string) => void;
  onCustomChange: (value: string) => void;
  ariaLabel?: string;
  selectedVariant?: 'border' | 'ring';
  className?: string;
}

const FALLBACK_SWATCH_COLORS = ['#f87171', '#fbbf24', '#4ade80', '#38bdf8', '#a78bfa', '#f472b6'];
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const getNativeColorInputValue = (
  colorInputValue: string,
  selectedOptionValue: string | undefined,
  firstOptionValue: string | undefined,
) => {
  if (HEX_COLOR_PATTERN.test(colorInputValue)) return colorInputValue;
  if (selectedOptionValue && HEX_COLOR_PATTERN.test(selectedOptionValue))
    return selectedOptionValue;
  if (firstOptionValue && HEX_COLOR_PATTERN.test(firstOptionValue)) return firstOptionValue;
  return '#f085cc';
};

const getCustomSwatchGradient = (options: readonly ColorSwatchPickerOption[]) => {
  const colors = options.map((option) => option.value).filter(Boolean);
  const swatchColors = colors.length > 0 ? colors : FALLBACK_SWATCH_COLORS;

  return `conic-gradient(from 90deg, ${[...swatchColors, swatchColors[0]].join(', ')})`;
};

export const ColorSwatchPicker = ({
  options,
  value,
  colorInputValue,
  onSelect,
  onCustomChange,
  ariaLabel = 'Pick a custom color',
  selectedVariant = 'ring',
  className = '',
}: ColorSwatchPickerProps) => {
  const normalizedValue = value.toLowerCase();
  const selectedOption = options.find(
    (option) =>
      option.id.toLowerCase() === normalizedValue || option.value.toLowerCase() === normalizedValue,
  );
  const customSelected = !selectedOption;
  const customPickerValue = getNativeColorInputValue(
    colorInputValue,
    selectedOption?.value,
    options[0]?.value,
  );

  const selectedClass =
    selectedVariant === 'border'
      ? 'border-surface-800 dark:border-white scale-110'
      : 'border-transparent ring-2 ring-offset-2 ring-primary-ink dark:ring-offset-surface-800 scale-110';
  const inactiveClass =
    selectedVariant === 'border'
      ? 'border-transparent hover:scale-105'
      : 'border-transparent hover:scale-110';
  const focusClass =
    'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-ink dark:ring-offset-surface-800';
  const customFocusClass =
    'peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-primary-ink dark:ring-offset-surface-800';
  const customInactiveClass = selectedVariant === 'border' ? 'hover:scale-105' : 'hover:scale-110';
  const customSwatchBackground = customSelected
    ? customPickerValue
    : getCustomSwatchGradient(options);
  const customStateClass = customSelected
    ? `border-2 ${selectedClass}`
    : `border-0 ${customInactiveClass}`;

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-3 ${className}`}>
      {options.map((option) => {
        const selected = option === selectedOption;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            title={option.label}
            aria-label={`Use ${option.label} color`}
            aria-pressed={selected}
            className={`size-8 shrink-0 rounded-full border-2 outline-hidden transition-all ${focusClass} ${
              selected ? selectedClass : inactiveClass
            }`}
            style={{ backgroundColor: option.value }}
          />
        );
      })}

      <div className="flex h-8 shrink-0 items-center gap-3">
        {options.length > 0 && <div className="h-8 w-px bg-surface-200 dark:bg-surface-700" />}

        <label title="Custom color" className="relative size-8 shrink-0 cursor-pointer">
          <input
            type="color"
            value={customPickerValue}
            onChange={(event) => onCustomChange(event.target.value)}
            aria-label={ariaLabel}
            className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0 outline-hidden"
          />
          <span
            aria-hidden="true"
            className={`pointer-events-none block size-8 rounded-full outline-hidden transition-all ${customFocusClass} ${customStateClass}`}
            style={{ background: customSwatchBackground }}
          />
        </label>
      </div>
    </div>
  );
};
