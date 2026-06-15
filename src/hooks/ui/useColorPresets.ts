import { useMemo } from 'react';
import { useSettingsStore } from '$context/settingsContext';
import { getColorSchemeColorPresets } from '$utils/color/scheme';
import { resolveEffectiveTheme } from '$utils/color/theme';

/**
 * Returns the color presets appropriate for the active color scheme.
 * Uses the active flavor's accent colors so item color swatches feel native
 * to the active palette, including the default scheme.
 */
export const useColorPresets = (): readonly string[] => {
  const { colorScheme, colorSchemeFlavor, theme } = useSettingsStore();

  return useMemo(
    () => getColorSchemeColorPresets(colorScheme, colorSchemeFlavor, resolveEffectiveTheme(theme)),
    [colorScheme, colorSchemeFlavor, theme],
  );
};
