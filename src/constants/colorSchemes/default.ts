import type { ColorSchemeAccent, ColorSchemeDefinition } from '$types/color';

const defaultAccentColors = [
  { name: 'Rose', value: '#f47b96' },
  { name: 'Peach', value: '#f5a06a' },
  { name: 'Amber', value: '#f5c430' },
  { name: 'Sage', value: '#72cc86' },
  { name: 'Teal', value: '#4ccfc4' },
  { name: 'Sky', value: '#60b8f5' },
  { name: 'Lavender', value: '#a88ef5' },
  { name: 'Pink', value: '#f085cc' },
] as const satisfies readonly ColorSchemeAccent[];

const defaultAccentColor = 'Pink';

const surfaces = {
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
} as const;

const amoledSurfaces = {
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#525252',
  600: '#2e2e2e',
  700: '#222222',
  800: '#141414',
  900: '#000000',
} as const;

export const defaultColorScheme: ColorSchemeDefinition = {
  id: 'default',
  name: 'Default',
  flavors: [
    {
      id: 'light',
      name: 'Light',
      mode: 'light',
      surfaces,
      accentColors: [...defaultAccentColors],
      defaultAccent: defaultAccentColor,
      semanticColors: {
        info: '#2563eb',
        warning: '#d97706',
        success: '#16a34a',
        error: '#dc2626',
      },
      statusColors: {
        needsAction: '#71717a',
        inProcess: '#2563eb',
        completed: '#16a34a',
        cancelled: '#e11d48',
      },
      priorityColors: { high: '#dc2626', medium: '#d97706', low: '#2563eb' },
    },
    {
      id: 'dark',
      name: 'Dark',
      mode: 'dark',
      surfaces,
      accentColors: [...defaultAccentColors],
      defaultAccent: defaultAccentColor,
      semanticColors: {
        info: '#60a5fa',
        warning: '#fbbf24',
        success: '#4ade80',
        error: '#f87171',
      },
      statusColors: {
        needsAction: '#a1a1aa',
        inProcess: '#60a5fa',
        completed: '#4ade80',
        cancelled: '#fb7185',
      },
      priorityColors: { high: '#f87171', medium: '#fbbf24', low: '#60a5fa' },
    },
    {
      id: 'amoled',
      name: 'AMOLED',
      mode: 'dark',
      surfaces: amoledSurfaces,
      accentColors: [...defaultAccentColors],
      defaultAccent: defaultAccentColor,
      semanticColors: {
        info: '#60a5fa',
        warning: '#fbbf24',
        success: '#4ade80',
        error: '#f87171',
      },
      statusColors: {
        needsAction: '#a1a1aa',
        inProcess: '#60a5fa',
        completed: '#4ade80',
        cancelled: '#fb7185',
      },
      priorityColors: { high: '#f87171', medium: '#fbbf24', low: '#60a5fa' },
    },
  ],
};
