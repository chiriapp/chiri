import type { ColorSchemeDefinition, ColorSchemeFlavor, ColorSchemeMode } from '$types/color';
import { getColorSchemeFlavor } from '$utils/color/scheme';

interface ColorSchemePreviewPalette {
  background: string;
  sidebar: string;
  panel: string;
  selected: string;
  border: string;
  text: string;
  muted: string;
  badge: string;
}

export const getPreviewFlavor = (
  scheme: ColorSchemeDefinition,
  activeScheme: ColorSchemeDefinition,
  activeFlavor: ColorSchemeFlavor,
  effectiveMode: ColorSchemeMode,
) =>
  scheme.id === activeScheme.id
    ? activeFlavor
    : getColorSchemeFlavor(scheme.id, null, effectiveMode);

export const getColorSchemePreviewPalette = (
  flavor: ColorSchemeFlavor,
): ColorSchemePreviewPalette => {
  if (flavor.mode === 'light') {
    return {
      background: flavor.surfaces[50],
      sidebar: flavor.surfaces[100],
      panel: '#ffffff',
      selected: flavor.surfaces[200],
      border: flavor.surfaces[200],
      text: flavor.surfaces[800],
      muted: flavor.surfaces[500],
      badge: flavor.surfaces[100],
    };
  }

  return {
    background: flavor.surfaces[900],
    sidebar: flavor.surfaces[900],
    panel: flavor.surfaces[800],
    selected: flavor.surfaces[700],
    border: flavor.surfaces[700],
    text: flavor.surfaces[200],
    muted: flavor.surfaces[400],
    badge: flavor.surfaces[700],
  };
};
