import { useEffect } from 'react';
import { COLOR_SCHEMES, getColorSchemeFlavor } from '$constants/colorSchemes';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { DEFAULT_COLOR_SCHEME_ID } from '$types/color';
import {
  applyAccentColor,
  applyColorScheme,
  applySchemeAccentColor,
  applyTheme,
  resolveAccentColor,
  resolveEffectiveTheme,
} from '$utils/color';

/**
 * applies the theme, color scheme surface palette, and accent color, and
 * listens for system preference changes.
 *
 * when the theme mode changes (light ↔ dark), any active scheme flavor that
 * is incompatible with the new mode is automatically swapped to the first
 * compatible one.
 */
export const useTheme = () => {
  const { theme, accentColor, colorScheme, colorSchemeFlavor, setColorScheme } = useSettingsStore();

  const isDefaultScheme = colorScheme === DEFAULT_COLOR_SCHEME_ID;

  // apply theme; auto-switch flavor when the effective mode changes
  useEffect(() => {
    applyTheme(theme);

    const scheme = COLOR_SCHEMES.find((s) => s.id === colorScheme);
    const effectiveMode = resolveEffectiveTheme(theme);
    if (scheme && scheme.flavors.length > 0) {
      const currentFlavor = scheme.flavors.find((f) => f.id === colorSchemeFlavor);

      if (currentFlavor && currentFlavor.mode !== effectiveMode) {
        const compatible = scheme.flavors.find((f) => f.mode === effectiveMode);
        if (compatible) {
          // Pass the compatible flavor's defaultAccent as the fallback so that
          // setColorScheme restores the saved accent (if any) or uses the default.
          setColorScheme(colorScheme, compatible.id, compatible.defaultAccent);
        } else {
          // No flavor supports this mode - fall back to the default scheme
          setColorScheme(DEFAULT_COLOR_SCHEME_ID, null);
        }
      }
    }

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        applyTheme('system');

        const nextMode = resolveEffectiveTheme('system');
        const currentScheme = COLOR_SCHEMES.find((s) => s.id === colorScheme);
        const currentFlavor = currentScheme?.flavors.find((f) => f.id === colorSchemeFlavor);

        if (currentScheme && currentFlavor && currentFlavor.mode !== nextMode) {
          const compatible = currentScheme.flavors.find((f) => f.mode === nextMode);
          if (compatible) {
            setColorScheme(colorScheme, compatible.id, compatible.defaultAccent);
            return;
          }
        }

        applyColorScheme(colorScheme, colorSchemeFlavor, nextMode);
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [colorScheme, colorSchemeFlavor, setColorScheme, theme]);

  // apply color scheme surface palette
  useEffect(() => {
    applyColorScheme(colorScheme, colorSchemeFlavor, resolveEffectiveTheme(theme));
  }, [colorScheme, colorSchemeFlavor, theme]);

  // apply accent color — resolve name→hex first, then normalize pastel scheme colors
  useEffect(() => {
    const flavor = getColorSchemeFlavor(
      colorScheme,
      colorSchemeFlavor,
      resolveEffectiveTheme(theme),
    );
    const resolved = resolveAccentColor(accentColor, flavor.accentColors);
    if (isDefaultScheme) {
      applyAccentColor(resolved);
    } else {
      applySchemeAccentColor(resolved);
    }
  }, [accentColor, isDefaultScheme, colorScheme, colorSchemeFlavor, theme]);

  return { theme, accentColor, colorScheme, colorSchemeFlavor };
};
