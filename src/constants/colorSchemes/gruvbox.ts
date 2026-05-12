import type { ColorSchemeDefinition } from '$types/color';

export const gruvboxColorScheme: ColorSchemeDefinition = {
  id: 'gruvbox',
  name: 'Gruvbox',
  flavors: [
    {
      id: 'dark',
      name: 'Dark',
      mode: 'dark',
      // 50: light0 (highlight); 100–200: light1 fg; 300–400: light2–3 secondary; 500+: dark surfaces/bg
      surfaces: {
        50: '#fbf1c7', // light0 (brightest fg)
        100: '#ebdbb2', // light1 (fg)
        200: '#ebdbb2', // light1 (fg)   ← primary text
        300: '#d5c4a1', // light2
        400: '#bdae93', // light3        ← secondary text
        500: '#a89984', // light4
        600: '#665c54', // dark3
        700: '#3c3836', // dark1         ← borders / hover
        800: '#282828', // dark0         ← main bg
        900: '#1d2021', // dark0_hard
      },
      accentColors: [
        { name: 'Red', value: '#fb4934' },
        { name: 'Orange', value: '#fe8019' },
        { name: 'Yellow', value: '#fabd2f' },
        { name: 'Green', value: '#b8bb26' },
        { name: 'Aqua', value: '#8ec07c' },
        { name: 'Blue', value: '#83a598' },
        { name: 'Purple', value: '#d3869b' },
      ],
      defaultAccent: 'Yellow',
      semanticColors: {
        info: '#83a598',
        warning: '#fabd2f',
        success: '#b8bb26',
        error: '#fb4934',
      },
      statusColors: {
        needsAction: '#a89984',
        inProcess: '#83a598',
        completed: '#b8bb26',
        cancelled: '#fb4934',
      },
      priorityColors: { high: '#fb4934', medium: '#fabd2f', low: '#83a598' },
    },
    {
      id: 'light',
      name: 'Light',
      mode: 'light',
      // light → dark: light0_hard (bg) → dark0 (darkest text)
      surfaces: {
        50: '#f9f5d7', // light0_hard   ← hover tint
        100: '#f2e5bc', // light0_soft
        200: '#d5c4a1', // light2        ← borders (skipping light1 for more contrast)
        300: '#bdae93', // light3
        400: '#a89984', // light4
        500: '#7c6f64', // dark4         ← secondary text
        600: '#665c54', // dark3
        700: '#504945', // dark2
        800: '#3c3836', // dark1         ← primary text
        900: '#282828', // dark0
      },
      accentColors: [
        { name: 'Red', value: '#cc241d' },
        { name: 'Orange', value: '#d65d0e' },
        { name: 'Yellow', value: '#d79921' },
        { name: 'Green', value: '#98971a' },
        { name: 'Aqua', value: '#689d6a' },
        { name: 'Blue', value: '#458588' },
        { name: 'Purple', value: '#b16286' },
      ],
      defaultAccent: 'Yellow',
      semanticColors: {
        info: '#458588',
        warning: '#d79921',
        success: '#98971a',
        error: '#cc241d',
      },
      statusColors: {
        needsAction: '#7c6f64',
        inProcess: '#458588',
        completed: '#98971a',
        cancelled: '#cc241d',
      },
      priorityColors: { high: '#cc241d', medium: '#d79921', low: '#458588' },
    },
  ],
};
