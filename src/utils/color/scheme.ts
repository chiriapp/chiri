import Monitor from 'lucide-react/icons/monitor';
import Moon from 'lucide-react/icons/moon';
import Sun from 'lucide-react/icons/sun';
import { createElement, type ReactNode } from 'react';
import { COLOR_SCHEMES, DEFAULT_COLOR_SCHEME_ID, defaultColorScheme } from '$constants/color';
import type { AccentColor, ColorSchemeFlavor, ColorSchemeMode, Theme } from '$types/color';
import { resolveAccentColor } from '$utils/color/accent';
import { getPreviewFlavor } from '$utils/color/preview';
import { resolveEffectiveTheme } from '$utils/color/theme';

const SURFACE_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

export const getColorScheme = (schemeId: string) =>
  COLOR_SCHEMES.find((scheme) => scheme.id === schemeId) ?? defaultColorScheme;

export const getColorSchemeFlavor = (
  schemeId: string,
  flavorId: string | null,
  mode?: ColorSchemeMode,
) => {
  const scheme = getColorScheme(schemeId);

  return (
    (flavorId ? scheme.flavors.find((flavor) => flavor.id === flavorId) : undefined) ??
    (mode ? scheme.flavors.find((flavor) => flavor.mode === mode) : undefined) ??
    scheme.flavors[0] ??
    defaultColorScheme.flavors[0]
  );
};

export const getColorSchemeAccentColors = (
  schemeId: string,
  flavorId: string | null,
  mode?: ColorSchemeMode,
) => getColorSchemeFlavor(schemeId, flavorId, mode).accentColors;

export const getColorSchemeColorPresets = (
  schemeId: string,
  flavorId: string | null,
  mode?: ColorSchemeMode,
) => getColorSchemeAccentColors(schemeId, flavorId, mode).map((color) => color.value);

export const getDefaultAccentColor = () => defaultColorScheme.flavors[0].defaultAccent;

export const getColorSchemeFlavorDefaultAccentColor = (flavor: ColorSchemeFlavor) =>
  flavor.accentColors.find((color) => color.name === flavor.defaultAccent)?.value ??
  flavor.accentColors[0]?.value ??
  '#f085cc';

export const getFallbackItemColor = () => {
  const flavor = defaultColorScheme.flavors[0];
  return getColorSchemeFlavorDefaultAccentColor(flavor);
};

/**
 * theme options for appearance settings
 */
export const THEME_OPTIONS: Array<{
  value: Theme;
  icon: ReactNode;
  label: string;
}> = [
  { value: 'light', icon: createElement(Sun, { className: 'h-4 w-4' }), label: 'Light' },
  { value: 'dark', icon: createElement(Moon, { className: 'h-4 w-4' }), label: 'Dark' },
  { value: 'system', icon: createElement(Monitor, { className: 'h-4 w-4' }), label: 'System' },
];

export const CUSTOM_ACCENT_PATTERN = /^#[0-9a-f]{6}$/i;

export const THEME_MODE_LABELS = {
  light: 'Light',
  dark: 'Dark',
} as const satisfies Record<ColorSchemeMode, string>;

interface AppearanceColorStateArgs {
  theme: Theme;
  accentColor: AccentColor;
  colorScheme: string;
  colorSchemeFlavor: ColorSchemeFlavor['id'] | null;
}

interface AppearanceColorOption {
  id: string;
  name: string;
  detail: string;
  modeLabel: string;
  flavor: ColorSchemeFlavor;
}

interface ColorSchemeSelection {
  colorScheme: string;
  colorSchemeFlavor: ColorSchemeFlavor['id'] | null;
  accentColor: AccentColor;
  theme?: ColorSchemeMode;
}

const getModeLabel = (flavor: ColorSchemeFlavor, matchesEffectiveMode: boolean) => {
  const label = THEME_MODE_LABELS[flavor.mode];
  return matchesEffectiveMode ? label : `${label} only`;
};

export const getAppearanceColorState = ({
  theme,
  accentColor,
  colorScheme,
  colorSchemeFlavor,
}: AppearanceColorStateArgs) => {
  const effectiveMode = resolveEffectiveTheme(theme);
  const activeScheme = getColorScheme(colorScheme) ?? COLOR_SCHEMES[0];
  const availableFlavors = activeScheme.flavors.filter((flavor) => flavor.mode === effectiveMode);
  const activeFlavor = getColorSchemeFlavor(colorScheme, colorSchemeFlavor, effectiveMode);
  const accentColors = activeFlavor.accentColors;

  const schemeOptions: AppearanceColorOption[] = COLOR_SCHEMES.map((scheme) => {
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

  const flavorOptions: AppearanceColorOption[] = availableFlavors.map((flavor) => ({
    id: flavor.id,
    name: flavor.name,
    detail: `${THEME_MODE_LABELS[flavor.mode]} flavor`,
    modeLabel: THEME_MODE_LABELS[flavor.mode],
    flavor,
  }));

  return {
    effectiveMode,
    activeScheme,
    availableFlavors,
    activeFlavor,
    accentColors,
    resolvedAccentColor: resolveAccentColor(accentColor, accentColors),
    schemeOptions,
    flavorOptions,
    accentOptions: accentColors.map((color) => ({
      id: color.name,
      value: color.value,
      label: color.name,
    })),
  };
};

export const getColorSchemeSelection = (
  schemeId: string,
  effectiveMode: ColorSchemeMode,
): ColorSchemeSelection | null => {
  const scheme = COLOR_SCHEMES.find((candidate) => candidate.id === schemeId);
  if (!scheme) return null;

  if (scheme.id === DEFAULT_COLOR_SCHEME_ID) {
    const flavor = getColorSchemeFlavor(DEFAULT_COLOR_SCHEME_ID, null, effectiveMode);
    return {
      colorScheme: DEFAULT_COLOR_SCHEME_ID,
      colorSchemeFlavor: null,
      accentColor: flavor.defaultAccent,
    };
  }

  const compatibleFlavor = scheme.flavors.find((flavor) => flavor.mode === effectiveMode);
  const flavor = compatibleFlavor ?? scheme.flavors[0];
  if (!flavor) return null;

  return {
    colorScheme: schemeId,
    colorSchemeFlavor: flavor.id,
    accentColor: flavor.defaultAccent,
    theme: compatibleFlavor ? undefined : flavor.mode,
  };
};

export const shouldResetAccentForFlavor = (accentColor: AccentColor, flavor: ColorSchemeFlavor) =>
  !CUSTOM_ACCENT_PATTERN.test(accentColor) &&
  !flavor.accentColors.some((color) => color.name === accentColor);

/**
 * apply a color scheme's surface palette as CSS custom properties
 */
export const applyColorScheme = (
  schemeId: string,
  flavorId: ColorSchemeFlavor['id'] | null,
  mode?: ColorSchemeMode,
) => {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const flavor = getColorSchemeFlavor(schemeId, flavorId, mode);

  for (const shade of SURFACE_SHADES) {
    root.style.setProperty(`--surface-${shade}`, flavor.surfaces[shade]);
  }

  root.style.setProperty('--semantic-info', flavor.semanticColors.info);
  root.style.setProperty('--semantic-warning', flavor.semanticColors.warning);
  root.style.setProperty('--semantic-success', flavor.semanticColors.success);
  root.style.setProperty('--semantic-error', flavor.semanticColors.error);

  root.style.setProperty('--status-needs-action', flavor.statusColors.needsAction);
  root.style.setProperty('--status-in-process', flavor.statusColors.inProcess);
  root.style.setProperty('--status-completed', flavor.statusColors.completed);
  root.style.setProperty('--status-cancelled', flavor.statusColors.cancelled);

  root.style.setProperty('--priority-high', flavor.priorityColors.high);
  root.style.setProperty('--priority-medium', flavor.priorityColors.medium);
  root.style.setProperty('--priority-low', flavor.priorityColors.low);
};
