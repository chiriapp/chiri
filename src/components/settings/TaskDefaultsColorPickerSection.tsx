import Grip from 'lucide-react/icons/grip';
import Palette from 'lucide-react/icons/palette';
import Wand2 from 'lucide-react/icons/wand-2';
import { useState } from 'react';
import { ComposedInput } from '$components/ComposedInput';

type ColorMode = 'accent' | 'preset' | 'custom';

const SWITCHER_CLASS =
  'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset';
const SWITCHER_ACTIVE =
  'border-surface-300 dark:border-surface-500 bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100';
const SWITCHER_INACTIVE =
  'border-surface-200 dark:border-surface-700 hover:border-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400';

const initColorMode = (value: string, presets: readonly string[]): ColorMode => {
  if (value === 'accent') return 'accent';
  if ((presets as string[]).includes(value)) return 'preset';
  return 'custom';
};

interface TaskDefaultsColorPickerSectionProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  presets: readonly string[];
  accentColor: string;
}

export const TaskDefaultsColorPickerSection = ({
  label,
  value,
  onChange,
  presets,
  accentColor,
}: TaskDefaultsColorPickerSectionProps) => {
  const [mode, setMode] = useState<ColorMode>(() => initColorMode(value, presets));
  const fallbackColor = presets[0] ?? accentColor;

  return (
    <div className="p-4">
      <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">{label}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode('accent');
            onChange('accent');
          }}
          className={`${SWITCHER_CLASS} ${mode === 'accent' ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
        >
          <Wand2 className="w-4 h-4" />
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
          <Grip className="w-4 h-4" />
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
          <Palette className="w-4 h-4" />
          Use custom
        </button>
      </div>
      {mode !== 'accent' && (
        <div className="flex items-center gap-2 mt-3">
          {mode === 'preset' ? (
            presets.map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => onChange(preset)}
                className={`w-8 h-8 rounded-full border-2 transition-all outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 ${
                  value === preset
                    ? 'border-surface-800 dark:border-white scale-110'
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
                className="w-10 h-10 rounded-lg border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-700 hover:border-surface-300 dark:hover:border-surface-500 transition-colors cursor-pointer [&::-webkit-color-swatch-wrapper]:p-2 [&::-webkit-color-swatch]:rounded-full"
              />
              <ComposedInput
                type="text"
                value={value}
                onChange={onChange}
                placeholder={fallbackColor}
                className="flex-1 px-3 py-2 text-sm font-mono text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};
