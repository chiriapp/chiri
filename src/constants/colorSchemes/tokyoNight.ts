import type { ColorSchemeDefinition } from '$types/color';

export const tokyoNightColorScheme: ColorSchemeDefinition = {
  id: 'tokyo-night',
  name: 'Tokyo Night',
  flavors: [
    {
      id: 'night',
      name: 'Night',
      mode: 'dark',
      // 50–200: fg (primary); 300: fg_dark (secondary text); 400+: mid/dark surfaces and bg
      surfaces: {
        50: '#c0caf5', // fg
        100: '#c0caf5', // fg             ← selected/highlighted text
        200: '#c0caf5', // fg             ← primary text (dark:text-surface-200)
        300: '#a9b1d6', // fg_dark
        400: '#737aa2', // dark5          ← secondary text
        500: '#545c7e', // dark3
        600: '#414868', // terminal_black
        700: '#292e42', // bg_highlight   ← borders / hover
        800: '#1a1b26', // bg             ← main bg
        900: '#16161e', // bg_dark
      },
      accentColors: [
        { name: 'Red', value: '#f7768e' },
        { name: 'Orange', value: '#ff9e64' },
        { name: 'Yellow', value: '#e0af68' },
        { name: 'Green', value: '#9ece6a' },
        { name: 'Teal', value: '#73daca' },
        { name: 'Cyan', value: '#7dcfff' },
        { name: 'Blue', value: '#7aa2f7' },
        { name: 'Purple', value: '#9d7cd8' },
        { name: 'Magenta', value: '#bb9af7' },
      ],
      defaultAccent: '#7aa2f7',
      semanticColors: {
        info: '#7aa2f7',
        warning: '#e0af68',
        success: '#9ece6a',
        error: '#f7768e',
      },
      statusColors: {
        needsAction: '#737aa2',
        inProcess: '#7aa2f7',
        completed: '#9ece6a',
        cancelled: '#f7768e',
      },
      priorityColors: { high: '#f7768e', medium: '#e0af68', low: '#7aa2f7' },
    },
  ],
};
