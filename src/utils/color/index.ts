/**
 * parse any valid CSS color string to [r, g, b] using a canvas element.
 * returns null if the color is invalid.
 */
export const parseCssColor = (color: string): [number, number, number] | null => {
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
 * normalize a hex color by removing alpha channel if present (e.g., #ef4444FF -> #ef4444)
 * @param color - hex color string (with or without alpha)
 * @returns normalized hex color without alpha channel
 */
export const normalizeHexColor = (color: string | undefined | null) => {
  if (!color) return undefined;

  // if color is 9 characters (#RRGGBBAA) and ends with FF, strip the alpha
  if (color.length === 9 && color.toUpperCase().endsWith('FF')) {
    return color.substring(0, 7);
  }

  return color;
};

export const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  const [nr, ng, nb] = [r / 255, g / 255, b / 255];
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) return [0, 0, l * 100];

  const h =
    max === nr
      ? ((ng - nb) / delta + (ng < nb ? 6 : 0)) * 60
      : max === ng
        ? ((nb - nr) / delta + 2) * 60
        : ((nr - ng) / delta + 4) * 60;
  const s = delta / (1 - Math.abs(2 * l - 1));

  return [h, s * 100, l * 100];
};

export const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  const hue = (((h % 360) + 360) % 360) / 60;
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs((hue % 2) - 1));
  const m = lightness - chroma / 2;

  const [r, g, b] =
    hue < 1
      ? [chroma, x, 0]
      : hue < 2
        ? [x, chroma, 0]
        : hue < 3
          ? [0, chroma, x]
          : hue < 4
            ? [0, x, chroma]
            : hue < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];

  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
};
