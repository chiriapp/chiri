import { DEFAULT_COLOR_SCHEME_ID } from '$constants/colorSchemes';
import type { AccentColor } from '$types/color';
import { getColorSchemeColorPresets } from '$utils/color/scheme';

/**
 * generate a consistent color for a tag based on its name
 */
export const generateTagColor = (
  name: string,
  presets: readonly AccentColor[] = getColorSchemeColorPresets(DEFAULT_COLOR_SCHEME_ID, null),
) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  // mix bits so low-bit clustering doesn't cause color collisions on short names
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x45d9f3b7);
  hash ^= hash >>> 16;

  const availablePresets =
    presets.length > 0 ? presets : getColorSchemeColorPresets(DEFAULT_COLOR_SCHEME_ID, null);

  return availablePresets[Math.abs(hash) % availablePresets.length];
};
