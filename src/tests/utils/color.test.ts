import { describe, expect, it, vi } from 'vitest';

// color.ts imports from $constants and $types which may pull in heavy chains.
// stub the color-scheme constants module since we only test pure helpers
vi.mock('$constants/colorSchemes', () => ({
  getColorSchemeColorPresets: () => ['#ef4444', '#f97316', '#22c55e', '#3b82f6'],
  getColorSchemeFlavor: () => ({
    surfaces: {},
    semanticColors: {},
    statusColors: {},
    priorityColors: {},
  }),
}));
vi.mock('$types/color', () => ({ DEFAULT_COLOR_SCHEME_ID: 'default' }));

import {
  generateTagColor,
  getContrastTextColor,
  normalizeHexColor,
  resolveAccentColor,
} from '$utils/color';

describe('normalizeHexColor', () => {
  it('returns undefined for null/undefined', () => {
    expect(normalizeHexColor(null)).toBeUndefined();
    expect(normalizeHexColor(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string (falsy)', () => {
    expect(normalizeHexColor('')).toBeUndefined();
  });

  it('strips FF alpha from a 9-char hex', () => {
    expect(normalizeHexColor('#ef4444FF')).toBe('#ef4444');
  });

  it('handles uppercase and lowercase FF alpha equally', () => {
    expect(normalizeHexColor('#ef4444ff')).toBe('#ef4444');
    expect(normalizeHexColor('#EF4444FF')).toBe('#EF4444');
  });

  it('preserves 9-char hex with non-FF alpha', () => {
    expect(normalizeHexColor('#ef444480')).toBe('#ef444480');
  });

  it('preserves 7-char hex unchanged', () => {
    expect(normalizeHexColor('#ef4444')).toBe('#ef4444');
  });

  it('does not normalize 4-char short hex (no rule defined)', () => {
    expect(normalizeHexColor('#fff')).toBe('#fff');
  });
});

describe('resolveAccentColor', () => {
  const presets = [
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Sky', value: '#0ea5e9' },
  ];

  it('returns the preset value when stored matches a preset name', () => {
    expect(resolveAccentColor('Rose', presets)).toBe('#f43f5e');
    expect(resolveAccentColor('Sky', presets)).toBe('#0ea5e9');
  });

  it('returns the stored value unchanged when no preset matches', () => {
    expect(resolveAccentColor('#abc123', presets)).toBe('#abc123');
  });

  it('handles empty preset list', () => {
    expect(resolveAccentColor('#abc123', [])).toBe('#abc123');
  });

  it('is case-sensitive on preset names', () => {
    expect(resolveAccentColor('rose', presets)).toBe('rose'); // not matched
  });
});

describe('generateTagColor', () => {
  const presets = ['#ef4444', '#f97316', '#22c55e', '#3b82f6'];

  it('produces a value from the preset list', () => {
    const result = generateTagColor('work', presets);
    expect(presets).toContain(result);
  });

  it('is deterministic for the same input', () => {
    expect(generateTagColor('work', presets)).toBe(generateTagColor('work', presets));
  });

  it('differs across nearby short names (bit-mixing)', () => {
    // bit-mixing is supposed to avoid clustering on short strings
    const a = generateTagColor('a', presets);
    const b = generateTagColor('b', presets);
    const c = generateTagColor('c', presets);
    const d = generateTagColor('d', presets);
    // at least 2 distinct values among 4 short names → mixing is working
    expect(new Set([a, b, c, d]).size).toBeGreaterThan(1);
  });

  it('handles empty preset list by falling back to defaults', () => {
    const result = generateTagColor('work', []);
    expect(result).toBeDefined();
  });

  it('handles unicode tag names', () => {
    expect(presets).toContain(generateTagColor('日本語', presets));
  });

  it('handles empty string', () => {
    expect(presets).toContain(generateTagColor('', presets));
  });
});

describe('getContrastTextColor', () => {
  // note: jsdom doesn't ship a canvas backend, so parseCssColor always returns null
  // here and getContrastTextColor falls back to '#ffffff' for every input. real
  // luminance-based contrast logic only runs in a browser/Tauri webview
  it('returns a 7-char hex color', () => {
    expect(getContrastTextColor('#ffffff')).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('falls back to white when color parsing fails (jsdom case)', () => {
    expect(getContrastTextColor('not a real color string at all')).toBe('#ffffff');
  });
});
