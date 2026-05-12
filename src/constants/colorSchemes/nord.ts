import type { ColorSchemeDefinition } from '$types/color';

export const nordColorScheme: ColorSchemeDefinition = {
  id: 'nord',
  name: 'Nord',
  flavors: [
    {
      id: 'dark',
      name: 'Dark',
      mode: 'dark',
      // 50–200: nord6 (primary fg per Nord docs); 300–400: nord5/4 (secondary fg); 500+: Polar Night surfaces/bg
      surfaces: {
        50: '#eceff4', // nord6 — Snow Storm 3
        100: '#eceff4', // nord6 — selected/highlighted text
        200: '#eceff4', // nord6 — primary text (per nordtheme.com)
        300: '#e5e9f0', // nord5 — Snow Storm 2
        400: '#d8dee9', // nord4 — Snow Storm 1     ← secondary text
        500: '#4c566a', // nord3 — Polar Night 4
        600: '#434c5e', // nord2 — Polar Night 3
        700: '#3b4252', // nord1 — Polar Night 2     ← borders / hover
        800: '#2e3440', // nord0 — Polar Night 1     ← main bg
        900: '#252b35', // derived darker
      },
      accentColors: [
        { name: 'Aurora Red', value: '#bf616a' },
        { name: 'Aurora Orange', value: '#d08770' },
        { name: 'Aurora Yellow', value: '#ebcb8b' },
        { name: 'Aurora Green', value: '#a3be8c' },
        { name: 'Frost Teal', value: '#8fbcbb' },
        { name: 'Frost Blue', value: '#88c0d0' },
        { name: 'Frost Dark Blue', value: '#5e81ac' },
        { name: 'Frost Indigo', value: '#81a1c1' },
        { name: 'Aurora Purple', value: '#b48ead' },
      ],
      defaultAccent: 'Frost Blue',
      semanticColors: {
        info: '#5e81ac',
        warning: '#ebcb8b',
        success: '#a3be8c',
        error: '#bf616a',
      },
      statusColors: {
        needsAction: '#d8dee9',
        inProcess: '#88c0d0',
        completed: '#a3be8c',
        cancelled: '#bf616a',
      },
      priorityColors: { high: '#bf616a', medium: '#ebcb8b', low: '#5e81ac' },
    },
  ],
};
