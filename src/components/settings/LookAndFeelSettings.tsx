import AlignJustify from 'lucide-react/icons/align-justify';
import Grip from 'lucide-react/icons/grip';
import LayoutList from 'lucide-react/icons/layout-list';
import Palette from 'lucide-react/icons/palette';
import { useState } from 'react';
import { ColorSchemeSelect, type ColorSchemeSelectOption } from '$components/ColorSchemeSelect';
import { ComposedInput } from '$components/ComposedInput';
import { TaskListDensityPreview } from '$components/settings/TaskListDensityPreview';
import { COLOR_SCHEMES, getColorSchemeFlavor } from '$constants/colorSchemes';
import { DEFAULT_COLOR_SCHEME_ID } from '$constants/colorSchemes/default';
import { THEME_OPTIONS } from '$constants/theme';
import { useSettingsStore } from '$context/settingsContext';
import type { ColorSchemeDefinition, ColorSchemeFlavor } from '$types/color';
import type { TaskListDensity } from '$types/settings';
import { resolveAccentColor, resolveEffectiveTheme } from '$utils/color';

const DENSITY_OPTIONS: { value: TaskListDensity; label: string; icon: React.ReactNode }[] = [
  { value: 'comfortable', label: 'Comfortable', icon: <LayoutList className="w-4 h-4" /> },
  { value: 'compact', label: 'Compact', icon: <AlignJustify className="w-4 h-4" /> },
];

const SWITCHER_CLASS =
  'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset';
const SWITCHER_ACTIVE =
  'border-surface-300 dark:border-surface-500 bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100';
const SWITCHER_INACTIVE =
  'border-surface-200 dark:border-surface-700 hover:border-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400';

const MODE_LABELS = {
  light: 'Light',
  dark: 'Dark',
} as const;

const getModeLabel = (flavor: ColorSchemeFlavor, matchesEffectiveMode: boolean) => {
  const label = MODE_LABELS[flavor.mode];
  return matchesEffectiveMode ? label : `${label} only`;
};

const getPreviewFlavor = (
  scheme: ColorSchemeDefinition,
  activeScheme: ColorSchemeDefinition,
  activeFlavor: ColorSchemeFlavor,
  effectiveMode: ColorSchemeFlavor['mode'],
) =>
  scheme.id === activeScheme.id
    ? activeFlavor
    : getColorSchemeFlavor(scheme.id, null, effectiveMode);

export const LookAndFeelSettings = () => {
  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    colorScheme,
    colorSchemeFlavor,
    setColorScheme,
    setColorSchemeFlavor,
    useAccentColorForCheckboxes,
    setUseAccentColorForCheckboxes,
    showCursorPointers,
    setShowCursorPointers,
    taskListDensity,
    setTaskListDensity,
  } = useSettingsStore();

  const effectiveMode = resolveEffectiveTheme(theme);
  const activeScheme = COLOR_SCHEMES.find((s) => s.id === colorScheme) ?? COLOR_SCHEMES[0];
  const isDefaultScheme = activeScheme.id === DEFAULT_COLOR_SCHEME_ID;

  const availableFlavors = activeScheme.flavors.filter((f) => f.mode === effectiveMode);
  const activeFlavor = getColorSchemeFlavor(colorScheme, colorSchemeFlavor, effectiveMode);
  const accentColors = activeFlavor.accentColors;

  const [accentMode, setAccentMode] = useState<'preset' | 'custom'>(() =>
    accentColors.some((c) => c.name === accentColor) ? 'preset' : 'custom',
  );

  const handleSchemeChange = (schemeId: string) => {
    const scheme = COLOR_SCHEMES.find((s) => s.id === schemeId);
    if (!scheme) return;

    if (scheme.id === DEFAULT_COLOR_SCHEME_ID) {
      const flavor = getColorSchemeFlavor(DEFAULT_COLOR_SCHEME_ID, null, effectiveMode);
      setColorScheme(DEFAULT_COLOR_SCHEME_ID, null, flavor.defaultAccent);
      setAccentMode('preset');
      return;
    }

    const compatible = scheme.flavors.find((f) => f.mode === effectiveMode);
    const flavor = compatible ?? scheme.flavors[0];
    if (!flavor) return;

    // If the scheme has no flavor for the current mode, switch the theme to
    // match (e.g. selecting a dark-only scheme while in light mode → go dark).
    if (!compatible) {
      setTheme(flavor.mode);
    }

    setColorScheme(schemeId, flavor.id, flavor.defaultAccent);
    setAccentMode('preset');
  };

  const handleFlavorChange = (flavorId: string) => {
    const flavor = activeScheme.flavors.find((f) => f.id === flavorId);
    if (!flavor) return;

    setColorSchemeFlavor(flavorId);

    if (!flavor.accentColors.some((c) => c.name === accentColor)) {
      setAccentColor(flavor.defaultAccent);
    }
  };

  const schemeOptions: ColorSchemeSelectOption[] = COLOR_SCHEMES.map((scheme) => {
    const previewFlavor = getPreviewFlavor(scheme, activeScheme, activeFlavor, effectiveMode);
    const matchesEffectiveMode = scheme.flavors.some((flavor) => flavor.mode === effectiveMode);

    return {
      id: scheme.id,
      name: scheme.name,
      detail: previewFlavor.name,
      modeLabel: getModeLabel(previewFlavor, matchesEffectiveMode),
      flavor: previewFlavor,
    };
  });

  const flavorOptions: ColorSchemeSelectOption[] = availableFlavors.map((flavor) => ({
    id: flavor.id,
    name: flavor.name,
    detail: `${MODE_LABELS[flavor.mode]} flavor`,
    modeLabel: MODE_LABELS[flavor.mode],
    flavor,
  }));

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
      </div>

      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <div className="p-4">
          <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
            Color scheme
          </p>
          <ColorSchemeSelect
            label="Color scheme"
            value={colorScheme}
            options={schemeOptions}
            onChange={handleSchemeChange}
          />

          {availableFlavors.length > 1 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
                Flavor
              </p>
              <ColorSchemeSelect
                label="Flavor"
                value={activeFlavor.id}
                options={flavorOptions}
                onChange={handleFlavorChange}
              />
            </div>
          )}
        </div>

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <div className="p-4">
          <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
            Accent color
          </p>

          {!isDefaultScheme ? (
            <div className="flex items-center gap-2">
              {accentColors.map((color) => (
                <button
                  type="button"
                  key={color.name}
                  onClick={() => setAccentColor(color.name)}
                  title={color.name}
                  className={`w-8 h-8 rounded-full border-2 transition-all outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 ${
                    accentColor === color.name
                      ? 'border-surface-800 dark:border-white scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAccentMode('preset');
                    if (!accentColors.some((c) => c.name === accentColor)) {
                      setAccentColor(activeFlavor.defaultAccent);
                    }
                  }}
                  className={`${SWITCHER_CLASS} ${accentMode === 'preset' ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
                >
                  <Grip className="w-4 h-4" />
                  Use preset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccentMode('custom');
                    // resolve name → hex so the color picker has a valid value
                    const resolved = resolveAccentColor(accentColor, accentColors);
                    if (resolved !== accentColor) setAccentColor(resolved);
                  }}
                  className={`${SWITCHER_CLASS} ${accentMode === 'custom' ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
                >
                  <Palette className="w-4 h-4" />
                  Use custom
                </button>
              </div>
              <div className="flex items-center gap-2 mt-3 min-h-10">
                {accentMode === 'preset' ? (
                  accentColors.map((color) => (
                    <button
                      type="button"
                      key={color.name}
                      onClick={() => setAccentColor(color.name)}
                      title={color.name}
                      className={`w-8 h-8 rounded-full border-2 transition-all outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 ${
                        accentColor === color.name
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
                      placeholder={resolveAccentColor(activeFlavor.defaultAccent, accentColors)}
                      className="flex-1 px-3 py-2 text-sm font-mono text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
                    />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
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
          <TaskListDensityPreview density={taskListDensity} />
        </div>
      </div>

      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <label className="flex items-center justify-between gap-4 p-4 cursor-pointer">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Use accent color for completed checkboxes
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Completed tasks use your selected accent
            </p>
          </div>
          <input
            type="checkbox"
            checked={useAccentColorForCheckboxes}
            onChange={(e) => setUseAccentColorForCheckboxes(e.target.checked)}
            className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden shrink-0"
          />
        </label>

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <label className="flex items-center justify-between gap-4 p-4 cursor-pointer">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Show pointer cursor on interactive controls
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Buttons, links, menus, and toggles use the hand cursor
            </p>
          </div>
          <input
            type="checkbox"
            checked={showCursorPointers}
            onChange={(e) => setShowCursorPointers(e.target.checked)}
            className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden shrink-0"
          />
        </label>
      </div>
    </div>
  );
};
