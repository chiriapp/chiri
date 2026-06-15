import { useCallback, useMemo } from 'react';
import { useSettingsStore } from '$context/settingsContext';
import { resolveAccentColor } from '$utils/color/accent';
import { getColorSchemeFlavor } from '$utils/color/scheme';
import { resolveEffectiveTheme } from '$utils/color/theme';

export const useAccentColorResolver = () => {
  const { colorScheme, colorSchemeFlavor, theme } = useSettingsStore();

  const accentColors = useMemo(() => {
    return getColorSchemeFlavor(colorScheme, colorSchemeFlavor, resolveEffectiveTheme(theme))
      .accentColors;
  }, [colorScheme, colorSchemeFlavor, theme]);

  return useCallback((color: string) => resolveAccentColor(color, accentColors), [accentColors]);
};

export const useResolvedAccentColor = () => {
  const { accentColor } = useSettingsStore();
  const resolveAccent = useAccentColorResolver();

  return useMemo(() => {
    return resolveAccent(accentColor);
  }, [accentColor, resolveAccent]);
};
