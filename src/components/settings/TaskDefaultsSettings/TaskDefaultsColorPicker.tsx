import Grip from 'lucide-react/icons/grip';
import Palette from 'lucide-react/icons/palette';
import Wand2 from 'lucide-react/icons/wand-2';
import { useState } from 'react';
import { ComposedInput } from '$components/ComposedInput';

type ColorMode = 'accent' | 'preset' | 'custom';

const SWITCHER_CLASS =
  'flex min-w-0 flex-1 basis-0 items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset';
const SWITCHER_ACTIVE =
  'border-surface-300 dark:border-surface-500 bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100';
const SWITCHER_INACTIVE =
  'border-surface-200 dark:border-surface-700 hover:border-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400';

const initColorMode = (value: string, presets: readonly string[]): ColorMode => {
  if (value === 'accent') return 'accent';
  if ((presets as string[]).includes(value)) return 'preset';
  return 'custom';
};

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
  const [mode, setMode] = useState<ColorMode>(() => initColorMode(value, presets));
  const fallbackColor = presets[0] ?? accentColor;

  return (
    <div className="p-4">
      <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">{label}</p>
      <div className="flex w-full gap-2">
        <button
          type="button"
          onClick={() => {
            setMode('accent');
            onChange('accent');
          }}
          className={`${SWITCHER_CLASS} ${mode === 'accent' ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
        >
          <Wand2 className="h-4 w-4" />
          Follow accent
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('preset');
            if (mode !== 'preset') onChange(fallbackColor);
          }}
          className={`${SWITCHER_CLASS} ${mode === 'preset' ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
        >
          <Grip className="h-4 w-4" />
          Use preset
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('custom');
            if (mode === 'accent') onChange(accentColor);
          }}
          className={`${SWITCHER_CLASS} ${mode === 'custom' ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
        >
          <Palette className="h-4 w-4" />
          Use custom
        </button>
      </div>
      {mode !== 'accent' && (
        <div className="mt-3 flex items-center gap-2">
          {mode === 'preset' ? (
            presets.map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => onChange(preset)}
                className={`h-8 w-8 rounded-full border-2 outline-hidden transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                  value === preset
                    ? 'scale-110 border-surface-800 dark:border-white'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: preset }}
              />
            ))
          ) : (
            <>
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-lg border border-surface-200 bg-surface-50 transition-colors hover:border-surface-300 dark:border-surface-600 dark:bg-surface-700 dark:hover:border-surface-500 [&::-webkit-color-swatch-wrapper]:p-2 [&::-webkit-color-swatch]:rounded-full"
              />
              <ComposedInput
                type="text"
                value={value}
                onChange={onChange}
                placeholder={fallbackColor}
                className="flex-1 rounded-lg border border-transparent bg-surface-100 px-3 py-2 font-mono text-sm text-surface-800 transition-colors focus:border-primary-500 focus:bg-white focus:outline-hidden dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};
