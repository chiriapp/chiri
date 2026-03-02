import { useEffect } from 'react';
import { useSettingsStore } from '@/context/settingsContext';
import { applyAccentColor, applyTheme } from '@/utils/color';

/**
 * hook that applies the theme and accent color, and listens for system preference changes
 */
export function useTheme() {
  const { theme, accentColor } = useSettingsStore();

  // apply theme
  useEffect(() => {
    // apply theme immediately
    applyTheme(theme);

    // listen for system theme changes if using system theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = () => {
        applyTheme('system');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // apply accent color
  useEffect(() => {
    applyAccentColor(accentColor);
  }, [accentColor]);

  return { theme, accentColor };
}
