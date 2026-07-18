import Palette from 'lucide-react/icons/palette';
import Wand2 from 'lucide-react/icons/wand-2';
import { ColorSwatchPicker } from '$components/ColorSwatchPicker';

const SWITCHER_CLASS =
  'flex min-w-0 flex-1 basis-0 items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset';
const SWITCHER_ACTIVE =
  'border-surface-300 dark:border-surface-500 bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100';
const SWITCHER_INACTIVE =
  'border-surface-200 dark:border-surface-700 hover:border-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400';

interface TaskDefaultsColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  presets: readonly string[];
  accentColor: string;
}

export const TaskDefaultsColorPicker = ({
  label,
  value,
  onChange,
  presets,
  accentColor,
}: TaskDefaultsColorPickerProps) => {
  const isAccent = value === 'accent';
  const resolvedValue = isAccent ? accentColor : value;

  const options = presets.map((preset) => ({ id: preset, value: preset, label: 'Color' }));

  return (
    <div className="p-4">
      <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">{label}</p>

      <div className="flex w-full gap-2">
        <button
          type="button"
          onClick={() => onChange('accent')}
          className={`${SWITCHER_CLASS} ${isAccent ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
        >
          <Wand2 className="h-4 w-4 shrink-0" />
          Follow accent color
        </button>
        <button
          type="button"
          onClick={() => onChange(resolvedValue)}
          className={`${SWITCHER_CLASS} ${!isAccent ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
        >
          <Palette className="h-4 w-4 shrink-0" />
          Use custom color
        </button>
      </div>

      {!isAccent && (
        <div className="mt-3">
          <ColorSwatchPicker
            options={options}
            value={value}
            colorInputValue={resolvedValue}
            onSelect={onChange}
            onCustomChange={onChange}
            ariaLabel={`Custom ${label.toLowerCase()}`}
          />
        </div>
      )}
    </div>
  );
};
