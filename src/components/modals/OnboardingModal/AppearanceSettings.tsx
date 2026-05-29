import Monitor from 'lucide-react/icons/monitor';
import Moon from 'lucide-react/icons/moon';
import Palette from 'lucide-react/icons/palette';
import Sun from 'lucide-react/icons/sun';
import SunMoon from 'lucide-react/icons/sun-moon';
import { ColorSchemeSelect, type ColorSchemeSelectOption } from '$components/ColorSchemeSelect';
import { ThemeOption } from '$components/modals/OnboardingModal/ThemeOption';
import { COLOR_SCHEMES, getColorSchemeFlavor } from '$constants/colorSchemes';
import { DEFAULT_COLOR_SCHEME_ID } from '$constants/colorSchemes/default';
import { useSettingsStore } from '$context/settingsContext';
import type { ColorSchemeDefinition, ColorSchemeFlavor } from '$types/color';
import { resolveAccentColor, resolveEffectiveTheme } from '$utils/color';

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

export const OnboardingAppearanceSettings = () => {
  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    colorScheme,
    colorSchemeFlavor,
    setColorScheme,
    setColorSchemeFlavor,
  } = useSettingsStore();

  const effectiveMode = resolveEffectiveTheme(theme);
  const activeScheme =
    COLOR_SCHEMES.find((scheme) => scheme.id === colorScheme) ?? COLOR_SCHEMES[0];
  const availableFlavors = activeScheme.flavors.filter((flavor) => flavor.mode === effectiveMode);
  const activeFlavor = getColorSchemeFlavor(colorScheme, colorSchemeFlavor, effectiveMode);
  const accentColors = activeFlavor.accentColors;
  const resolvedAccentColor = resolveAccentColor(accentColor, accentColors);

  const handleSchemeChange = (schemeId: string) => {
    const scheme = COLOR_SCHEMES.find((candidate) => candidate.id === schemeId);
    if (!scheme) return;

    if (scheme.id === DEFAULT_COLOR_SCHEME_ID) {
      const flavor = getColorSchemeFlavor(DEFAULT_COLOR_SCHEME_ID, null, effectiveMode);
      setColorScheme(DEFAULT_COLOR_SCHEME_ID, null, flavor.defaultAccent);
      return;
    }

    const compatibleFlavor = scheme.flavors.find((flavor) => flavor.mode === effectiveMode);
    const flavor = compatibleFlavor ?? scheme.flavors[0];
    if (!flavor) return;

    if (!compatibleFlavor) {
      setTheme(flavor.mode);
    }

    setColorScheme(schemeId, flavor.id, flavor.defaultAccent);
  };

  const handleFlavorChange = (flavorId: string) => {
    const flavor = activeScheme.flavors.find((candidate) => candidate.id === flavorId);
    if (!flavor) return;

    setColorSchemeFlavor(flavorId);

    if (!flavor.accentColors.some((color) => color.name === accentColor)) {
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
    <div className="space-y-3">
      <section className="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
        <div className="mb-3 flex items-center gap-2">
          <SunMoon className="h-4 w-4 text-primary-500" />
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Theme</h3>
        </div>
        <div className="flex gap-2">
          <ThemeOption
            icon={<Monitor className="h-4 w-4" />}
            label="System"
            selected={theme === 'system'}
            value="system"
            onSelect={setTheme}
          />
          <ThemeOption
            icon={<Sun className="h-4 w-4" />}
            label="Light"
            selected={theme === 'light'}
            value="light"
            onSelect={setTheme}
          />
          <ThemeOption
            icon={<Moon className="h-4 w-4" />}
            label="Dark"
            selected={theme === 'dark'}
            value="dark"
            onSelect={setTheme}
          />
        </div>
      </section>

      <section className="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
        <div className="mb-3 flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary-500" />
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Colors</h3>
        </div>

        <div className="grid gap-3">
          <div>
            <p className="mb-2 text-xs font-medium text-surface-500 dark:text-surface-400">
              Color scheme
            </p>
            <ColorSchemeSelect
              label="Color scheme"
              value={colorScheme}
              options={schemeOptions}
              onChange={handleSchemeChange}
            />
          </div>

          {availableFlavors.length > 1 && (
            <div>
              <p className="mb-2 text-xs font-medium text-surface-500 dark:text-surface-400">
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

        <div className="mt-3 border-t border-surface-200 pt-3 dark:border-surface-700">
          <p className="mb-2 text-xs font-medium text-surface-500 dark:text-surface-400">
            Accent color
          </p>
          <div className="flex flex-wrap gap-2">
            {accentColors.map((color) => {
              const isSelected =
                accentColor === color.name ||
                resolvedAccentColor.toLowerCase() === color.value.toLowerCase();

              return (
                <button
                  type="button"
                  key={color.name}
                  onClick={() => setAccentColor(color.name)}
                  title={color.name}
                  aria-label={`Use ${color.name} accent color`}
                  className={`h-8 w-8 rounded-full border-2 transition-all outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                    isSelected
                      ? 'scale-110 border-surface-800 dark:border-white'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                />
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
