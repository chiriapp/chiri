import type { AccentColor, ColorSchemeAccent } from '$types/color';
import { getContrastTextColor, hslToRgb, parseCssColor, rgbToHsl } from '$utils/color';

/**
 * resolve a stored accent value to a hex color
 * presets are stored by name (e.g. "Rose"); custom colors are stored as hex
 * if the stored value matches a preset name, returns its current hex, making
 * the palette resilient to hex changes without orphaning user selections
 */
export const resolveAccentColor = (
  stored: AccentColor,
  accentColors: ColorSchemeAccent[],
): AccentColor => {
  const preset = accentColors.find((c) => c.name === stored);
  return preset ? preset.value : stored;
};

const applyPrimaryPalette = (color: AccentColor, lightnessMultiplier: number) => {
  const root = document.documentElement;

  const rgb = parseCssColor(color);
  if (!rgb) return;
  const [r, g, b] = rgb;

  const [h, s, origL] = rgbToHsl(r, g, b);
  const lShift = (origL - 50) * lightnessMultiplier;
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

  root.style.setProperty('--primary-contrast-color', getContrastTextColor(color));
};

/**
 * like applyAccentColor, but anchors primary-500 to the exact chosen color by using
 * a 1.0× lightness shift. operates directly on parsed RGB. no intermediate string conversion
 */
export const applySchemeAccentColor = (color: AccentColor) => {
  applyPrimaryPalette(color, 1);
};

/**
 * apply accent color as CSS custom properties
 * generates a palette of shades from the base accent color
 */
export const applyAccentColor = (color: AccentColor) => {
  applyPrimaryPalette(color, 1);
};
