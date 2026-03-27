import AlignJustify from 'lucide-react/icons/align-justify';
import Grip from 'lucide-react/icons/grip';
import LayoutList from 'lucide-react/icons/layout-list';
import Palette from 'lucide-react/icons/palette';
import Wand2 from 'lucide-react/icons/wand-2';
import { useState } from 'react';
import { ComposedInput } from '$components/ComposedInput';
import type { TaskListDensity } from '$context/settingsContext';
import { THEME_OPTIONS } from '$data/theme';
import { useSettingsStore } from '$hooks/useSettingsStore';
import { ACCENT_COLORS, COLOR_PRESETS, FALLBACK_ITEM_COLOR } from '$utils/constants';

const DENSITY_OPTIONS: { value: TaskListDensity; label: string; icon: React.ReactNode }[] = [
  { value: 'comfortable', label: 'Comfortable', icon: <LayoutList className="w-4 h-4" /> },
  { value: 'compact', label: 'Compact', icon: <AlignJustify className="w-4 h-4" /> },
];

const SWITCHER_CLASS =
  'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset';
const SWITCHER_ACTIVE =
  'border-primary-400 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300';
const SWITCHER_INACTIVE =
  'border-surface-200 dark:border-surface-700 hover:border-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400';

type ColorMode = 'accent' | 'preset' | 'custom';

const initColorMode = (value: string, presets: readonly string[]): ColorMode => {
  if (value === 'accent') return 'accent';
  if ((presets as string[]).includes(value)) return 'preset';
  return 'custom';
};

export const LookAndFeelSettings = () => {
  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    taskListDensity,
    setTaskListDensity,
    defaultTagColor,
    setDefaultTagColor,
    defaultCalendarColor,
    setDefaultCalendarColor,
  } = useSettingsStore();

  const [accentMode, setAccentMode] = useState<'preset' | 'custom'>(() =>
    ACCENT_COLORS.some((c) => c.value === accentColor) ? 'preset' : 'custom',
  );
  const [tagColorMode, setTagColorMode] = useState<ColorMode>(() =>
    initColorMode(defaultTagColor, COLOR_PRESETS),
  );
  const [calendarColorMode, setCalendarColorMode] = useState<ColorMode>(() =>
    initColorMode(defaultCalendarColor, COLOR_PRESETS),
  );

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">
        Look & feel
      </h3>
      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <div className="p-4">
          <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">Theme</p>
          <div className="flex gap-2">
            {THEME_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`${SWITCHER_CLASS} ${theme === option.value ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <div className="p-4">
          <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
            Task list density
          </p>
          <div className="flex gap-2">
            {DENSITY_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => setTaskListDensity(option.value)}
                className={`${SWITCHER_CLASS} ${taskListDensity === option.value ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <div className="p-4">
          <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
            Accent color
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setAccentMode('preset');
                if (!ACCENT_COLORS.some((c) => c.value === accentColor))
                  setAccentColor(ACCENT_COLORS[0].value);
              }}
              className={`${SWITCHER_CLASS} ${accentMode === 'preset' ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
            >
              <Grip className="w-4 h-4" />
              Use preset
            </button>
            <button
              type="button"
              onClick={() => setAccentMode('custom')}
              className={`${SWITCHER_CLASS} ${accentMode === 'custom' ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
            >
              <Palette className="w-4 h-4" />
              Use custom
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            {accentMode === 'preset' ? (
              ACCENT_COLORS.map((color) => (
                <button
                  type="button"
                  key={color.value}
                  onClick={() => setAccentColor(color.value)}
                  title={color.name}
                  className={`w-8 h-8 rounded-full border-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 ${
                    accentColor === color.value
                      ? 'border-surface-800 dark:border-white scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                />
              ))
            ) : (
              <>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-700 hover:border-surface-300 dark:hover:border-surface-500 transition-colors cursor-pointer [&::-webkit-color-swatch-wrapper]:p-2 [&::-webkit-color-swatch]:rounded-full"
                />
                <ComposedInput
                  type="text"
                  value={accentColor}
                  onChange={setAccentColor}
                  placeholder={FALLBACK_ITEM_COLOR}
                  className="flex-1 px-3 py-2 text-sm font-mono text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <div className="p-4">
          <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
            Default calendar color
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setCalendarColorMode('accent');
                setDefaultCalendarColor('accent');
              }}
              className={`${SWITCHER_CLASS} ${calendarColorMode === 'accent' ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
            >
              <Wand2 className="w-4 h-4" />
              Follow accent
            </button>
            <button
              type="button"
              onClick={() => {
                setCalendarColorMode('preset');
                if (calendarColorMode !== 'preset') setDefaultCalendarColor(COLOR_PRESETS[0]);
              }}
              className={`${SWITCHER_CLASS} ${calendarColorMode === 'preset' ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
            >
              <Grip className="w-4 h-4" />
              Use preset
            </button>
            <button
              type="button"
              onClick={() => {
                setCalendarColorMode('custom');
                if (calendarColorMode === 'accent') setDefaultCalendarColor(accentColor);
              }}
              className={`${SWITCHER_CLASS} ${calendarColorMode === 'custom' ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
            >
              <Palette className="w-4 h-4" />
              Use custom
            </button>
          </div>
          {calendarColorMode !== 'accent' && (
            <div className="flex items-center gap-2 mt-3">
              {calendarColorMode === 'preset' ? (
                COLOR_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setDefaultCalendarColor(preset)}
                    className={`w-8 h-8 rounded-full border-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 ${
                      defaultCalendarColor === preset
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
                    value={defaultCalendarColor}
                    onChange={(e) => setDefaultCalendarColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-700 hover:border-surface-300 dark:hover:border-surface-500 transition-colors cursor-pointer [&::-webkit-color-swatch-wrapper]:p-2 [&::-webkit-color-swatch]:rounded-full"
                  />
                  <ComposedInput
                    type="text"
                    value={defaultCalendarColor}
                    onChange={setDefaultCalendarColor}
                    placeholder={FALLBACK_ITEM_COLOR}
                    className="flex-1 px-3 py-2 text-sm font-mono text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
                  />
                </>
              )}
            </div>
          )}
        </div>
        <div className="border-t border-surface-200 dark:border-surface-700" />

        <div className="p-4">
          <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
            Default tag color
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setTagColorMode('accent');
                setDefaultTagColor('accent');
              }}
              className={`${SWITCHER_CLASS} ${tagColorMode === 'accent' ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
            >
              <Wand2 className="w-4 h-4" />
              Follow accent
            </button>
            <button
              type="button"
              onClick={() => {
                setTagColorMode('preset');
                if (tagColorMode !== 'preset') setDefaultTagColor(COLOR_PRESETS[0]);
              }}
              className={`${SWITCHER_CLASS} ${tagColorMode === 'preset' ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
            >
              <Grip className="w-4 h-4" />
              Use preset
            </button>
            <button
              type="button"
              onClick={() => {
                setTagColorMode('custom');
                if (tagColorMode === 'accent') setDefaultTagColor(accentColor);
              }}
              className={`${SWITCHER_CLASS} ${tagColorMode === 'custom' ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
            >
              <Palette className="w-4 h-4" />
              Use custom
            </button>
          </div>
          {tagColorMode !== 'accent' && (
            <div className="flex items-center gap-2 mt-3">
              {tagColorMode === 'preset' ? (
                COLOR_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setDefaultTagColor(preset)}
                    className={`w-8 h-8 rounded-full border-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 ${
                      defaultTagColor === preset
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
                    value={defaultTagColor}
                    onChange={(e) => setDefaultTagColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-700 hover:border-surface-300 dark:hover:border-surface-500 transition-colors cursor-pointer [&::-webkit-color-swatch-wrapper]:p-2 [&::-webkit-color-swatch]:rounded-full"
                  />
                  <ComposedInput
                    type="text"
                    value={defaultTagColor}
                    onChange={setDefaultTagColor}
                    placeholder={FALLBACK_ITEM_COLOR}
                    className="flex-1 px-3 py-2 text-sm font-mono text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
