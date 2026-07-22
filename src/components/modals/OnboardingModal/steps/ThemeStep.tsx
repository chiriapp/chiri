import Palette from 'lucide-react/icons/palette';
import SunMoon from 'lucide-react/icons/sun-moon';
import { ColorSchemeSelect } from '$components/ColorSchemeSelect';
import { ColorSwatchPicker } from '$components/ColorSwatchPicker';
import { ThemeOption } from '$components/modals/OnboardingModal/ThemeOption';
import { useSettingsStore } from '$context/settingsContext';
import {
  getAppearanceColorState,
  getColorSchemeSelection,
  shouldResetAccentForFlavor,
  THEME_OPTIONS,
} from '$utils/color/scheme';

export const ThemeStep = () => {
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

  const {
    effectiveMode,
    activeScheme,
    availableFlavors,
    activeFlavor,
    resolvedAccentColor,
    schemeOptions,
    flavorOptions,
    accentOptions,
  } = getAppearanceColorState({ theme, accentColor, colorScheme, colorSchemeFlavor });

  const handleSchemeChange = (schemeId: string) => {
    const selection = getColorSchemeSelection(schemeId, effectiveMode);
    if (!selection) return;

    if (selection.theme) {
      setTheme(selection.theme);
    }

    setColorScheme(selection.colorScheme, selection.colorSchemeFlavor, selection.accentColor);
  };

  const handleFlavorChange = (flavorId: string) => {
    const flavor = activeScheme.flavors.find((candidate) => candidate.id === flavorId);
    if (!flavor) return;

    setColorSchemeFlavor(flavorId);

    if (shouldResetAccentForFlavor(accentColor, flavor)) {
      setAccentColor(flavor.defaultAccent);
    }
  };

  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
        <div className="mb-3 flex items-center gap-2">
          <SunMoon className="h-4 w-4 text-primary-500" />
          <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-100">Theme</h3>
        </div>
        <div className="flex gap-2">
          {THEME_OPTIONS.map((option) => (
            <ThemeOption
              key={option.value}
              icon={option.icon}
              label={option.label}
              selected={theme === option.value}
              value={option.value}
              onSelect={setTheme}
            />
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700">
        <div className="p-3">
          <div className="mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary-500" />
            <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-100">Colors</h3>
          </div>

          <div className="grid gap-3">
            <div>
              <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">
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
                <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">
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
        </div>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <div className="p-3">
          <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">
            Accent color
          </p>
          <ColorSwatchPicker
            options={accentOptions}
            value={accentColor}
            colorInputValue={resolvedAccentColor}
            onSelect={setAccentColor}
            onCustomChange={setAccentColor}
            selectedVariant="border"
          />
        </div>
      </section>
    </div>
  );
};
