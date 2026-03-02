import type { Theme } from '@/types';
import { COLOR_PRESETS } from './constants';

/**
 * calculate the relative luminance of a color to determine appropriate contrast text color
 * uses the standard relative luminance formula from WCAG guidelines
 */
export const getContrastTextColor = (hexColor: string): string => {
  // handle cases where color might be invalid
  if (!hexColor || !hexColor.startsWith('#')) {
    return '#ffffff';
  }

  try {
    // convert hex to RGB
    const r = parseInt(hexColor.substring(1, 3), 16);
    const g = parseInt(hexColor.substring(3, 5), 16);
    const b = parseInt(hexColor.substring(5, 7), 16);

    // calculate relative luminance using standard formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // return black text for bright colors, white for dark
    return luminance > 0.5 ? '#000000' : '#ffffff';
  } catch {
    // fallback to white text if parsing fails
    return '#ffffff';
  }
};

/**
 * generate a consistent color for a tag based on its name
 */
export const generateTagColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash = hash & hash;
  }

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
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

// Helper function to convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
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
}

// Helper function to convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
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
}

/**
 * apply accent color as CSS custom properties
 * generates a palette of shades from the base accent color
 */
export function applyAccentColor(color: string): void {
  const root = document.documentElement;

  // parse hex color to RGB
  const hex = color.replace('#', '');
  const r = Number.parseInt(hex.substring(0, 2), 16);
  const g = Number.parseInt(hex.substring(2, 4), 16);
  const b = Number.parseInt(hex.substring(4, 6), 16);

  // convert to HSL for easier shade generation
  const [h, s] = rgbToHsl(r, g, b);

  // generate shades (50-950) by varying lightness
  const shades = [
    { shade: 50, l: 97 },
    { shade: 100, l: 94 },
    { shade: 200, l: 86 },
    { shade: 300, l: 76 },
    { shade: 400, l: 64 },
    { shade: 500, l: 50 },
    { shade: 600, l: 42 },
    { shade: 700, l: 35 },
    { shade: 800, l: 28 },
    { shade: 900, l: 22 },
    { shade: 950, l: 14 },
  ];

  for (const { shade, l } of shades) {
    const [sr, sg, sb] = hslToRgb(h, s, l);
    root.style.setProperty(`--color-primary-${shade}`, `${sr} ${sg} ${sb}`);
  }
}
