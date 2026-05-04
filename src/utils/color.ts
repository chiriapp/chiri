import { COLOR_PRESETS } from '$constants';
import { COLOR_SCHEMES } from '$constants/colorSchemes';
import type { Theme } from '$types/color';

/**
 * parse any valid CSS color string to [r, g, b] using a canvas element.
 * returns null if the color is invalid.
 */
const parseCssColor = (color: string): [number, number, number] | null => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#000000';
    ctx.fillStyle = color;
    // if the color was invalid, fillStyle stays as the previous value (#000000)
    // we detect this by checking if an obviously-different color parses to black
    const normalized = ctx.fillStyle;
    if (!normalized.startsWith('#')) return null;
    const hex = normalized.slice(1);
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  } catch {
    return null;
  }
};

/**
 * calculate the relative luminance of a color to determine appropriate contrast text color
 * uses the standard relative luminance formula from WCAG guidelines
 */
export const getContrastTextColor = (color: string) => {
  const rgb = parseCssColor(color);
  if (!rgb) return '#ffffff';
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

/**
 * generate a consistent color for a tag based on its name
 */
export const generateTagColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  // mix bits so low-bit clustering doesn't cause color collisions on short names
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x45d9f3b7);
  hash ^= hash >>> 16;

  return COLOR_PRESETS[Math.abs(hash) % COLOR_PRESETS.length];
};

/**
 * normalize a hex color by removing alpha channel if present (e.g., #ef4444FF -> #ef4444)
 * @param color - hex color string (with or without alpha)
 * @returns normalized hex color without alpha channel
 */
export const normalizeHexColor = (color: string | undefined | null): string | undefined => {
  if (!color) return undefined;

  // if color is 9 characters (#RRGGBBAA) and ends with FF, strip the alpha
  if (color.length === 9 && color.toUpperCase().endsWith('FF')) {
    return color.substring(0, 7);
  }

  return color;
};

/**
 * apply the theme to the document
 */
export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
};

// Helper function to convert RGB to HSL
const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h * 360, s * 100, l * 100];
};

// Helper function to convert HSL to RGB
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  h /= 360;
  s /= 100;
  l /= 100;
  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

/**
 * resolve the effective theme (light or dark), accounting for system preference
 */
export const resolveEffectiveTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
};

const SURFACE_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

/**
 * like applyAccentColor, but anchors primary-500 to the exact chosen color by using
 * a 1.0× lightness shift. This means every element using primary-500 shows exactly
 * the color the user picked from the scheme's palette (e.g. Catppuccin's light pink
 * #f5c2e7 at L≈86% produces primary-500 at L=86%), with darker/lighter shades
 * radiating naturally from that anchor point.
 * Operates directly on parsed RGB — no intermediate string conversion.
 */
export const applySchemeAccentColor = (color: string) => {
  const root = document.documentElement;

  const rgb = parseCssColor(color);
  if (!rgb) return;
  const [r, g, b] = rgb;

  const [h, s, origL] = rgbToHsl(r, g, b);

  const lShift = (origL - 50) * 1.0;
  const cl = (l: number) => Math.max(5, Math.min(97, l + lShift));

  const shades = [
    { shade: 50, l: cl(97) },
    { shade: 100, l: cl(94) },
    { shade: 200, l: cl(86) },
    { shade: 300, l: cl(76) },
    { shade: 400, l: cl(64) },
    { shade: 500, l: cl(50) },
    { shade: 600, l: cl(42) },
    { shade: 700, l: cl(35) },
    { shade: 800, l: cl(28) },
    { shade: 900, l: cl(22) },
    { shade: 950, l: cl(14) },
  ] as const;

  for (const { shade, l } of shades) {
    const [sr, sg, sb] = hslToRgb(h, s, l);
    root.style.setProperty(`--primary-rgb-${shade}`, `${sr} ${sg} ${sb}`);
  }

  root.style.setProperty('--primary-contrast-color', getContrastTextColor(color));
};

/**
 * apply a color scheme's surface palette as CSS custom properties.
 * pass schemeId 'default' (or an unknown id) to clear all overrides.
 */
export const applyColorScheme = (schemeId: string, flavorId: string | null) => {
  const root = document.documentElement;

  const scheme = COLOR_SCHEMES.find((s) => s.id === schemeId);

  if (!scheme || scheme.id === 'default' || scheme.flavors.length === 0) {
    for (const shade of SURFACE_SHADES) {
      root.style.removeProperty(`--surface-${shade}`);
    }
    root.style.removeProperty('--semantic-info');
    root.style.removeProperty('--semantic-warning');
    root.style.removeProperty('--semantic-success');
    root.style.removeProperty('--semantic-error');

    root.style.removeProperty('--status-needs-action');
    root.style.removeProperty('--status-in-process');
    root.style.removeProperty('--status-completed');
    root.style.removeProperty('--status-cancelled');

    root.style.removeProperty('--priority-high');
    root.style.removeProperty('--priority-medium');
    root.style.removeProperty('--priority-low');
    return;
  }

  const flavor = flavorId ? scheme.flavors.find((f) => f.id === flavorId) : scheme.flavors[0];

  if (!flavor) return;

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

/**
 * apply accent color as CSS custom properties
 * generates a palette of shades from the base accent color
 */
export const applyAccentColor = (color: string) => {
  const root = document.documentElement;

  const rgb = parseCssColor(color);
  if (!rgb) return;
  const [r, g, b] = rgb;

  // convert to HSL for easier shade generation
  const [h, s, origL] = rgbToHsl(r, g, b);

  // shift the lightness range toward the input color's own lightness.
  // for mid-range colors (L≈50%) this is nearly a no-op; for light pastels or
  // dark colors it keeps the generated palette perceptually closer to the input.
  const lShift = (origL - 50) * 0.5;
  const cl = (l: number) => Math.max(5, Math.min(97, l + lShift));

  const shades = [
    { shade: 50, l: cl(97) },
    { shade: 100, l: cl(94) },
    { shade: 200, l: cl(86) },
    { shade: 300, l: cl(76) },
    { shade: 400, l: cl(64) },
    { shade: 500, l: cl(50) },
    { shade: 600, l: cl(42) },
    { shade: 700, l: cl(35) },
    { shade: 800, l: cl(28) },
    { shade: 900, l: cl(22) },
    { shade: 950, l: cl(14) },
  ];

  for (const { shade, l } of shades) {
    const [sr, sg, sb] = hslToRgb(h, s, l);
    root.style.setProperty(`--primary-rgb-${shade}`, `${sr} ${sg} ${sb}`);
  }

  // set contrast text color for primary-500 and primary-600 backgrounds
  // this will be black for bright colors, white for dark colors
  const contrastColor = getContrastTextColor(color);
  root.style.setProperty('--primary-contrast-color', contrastColor);
};
