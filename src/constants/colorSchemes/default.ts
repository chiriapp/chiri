import type { ColorSchemeAccent, ColorSchemeDefinition } from '$types/color';

const defaultAccentColors = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
] as const satisfies readonly ColorSchemeAccent[];

const defaultAccentColor = '#ec4899';

const surfaces = {
  50: '#fafafa',
  100: '#f4f4f5',
  200: '#e4e4e7',
  300: '#d4d4d8',
  400: '#a1a1aa',
  500: '#71717a',
  600: '#52525b',
  700: '#3f3f46',
  800: '#27272a',
  900: '#18181b',
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
  ],
};
