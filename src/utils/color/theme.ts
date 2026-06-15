import type { ColorSchemeMode, Theme } from '$types/color';

const prefersDarkMode = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;

/**
 * apply the theme to the document
 */
export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;

  if (theme === 'system') {
    root.classList.toggle('dark', prefersDarkMode());
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
};

/**
 * resolve the effective theme (light or dark), accounting for system preference
 */
export const resolveEffectiveTheme = (theme: Theme): ColorSchemeMode => {
  if (theme === 'system') {
    return prefersDarkMode() ? 'dark' : 'light';
  }
  return theme;
};
