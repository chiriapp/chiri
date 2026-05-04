import { catppuccinColorScheme } from '$constants/colorSchemes/catppuccin';
import { defaultColorScheme } from '$constants/colorSchemes/default';
import { gruvboxColorScheme } from '$constants/colorSchemes/gruvbox';
import { nordColorScheme } from '$constants/colorSchemes/nord';
import { tokyoNightColorScheme } from '$constants/colorSchemes/tokyoNight';
import type { ColorSchemeDefinition } from '$types/color';

export const COLOR_SCHEMES: ColorSchemeDefinition[] = [
  defaultColorScheme,
  catppuccinColorScheme,
  gruvboxColorScheme,
  nordColorScheme,
  tokyoNightColorScheme,
];
