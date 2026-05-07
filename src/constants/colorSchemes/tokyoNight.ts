import type { ColorSchemeDefinition } from '$types/color';

export const tokyoNightColorScheme: ColorSchemeDefinition = {
  id: 'tokyo-night',
  name: 'Tokyo Night',
  flavors: [
    {
      id: 'light',
      name: 'Light',
      mode: 'light',
      // 50–100: light content bg; 200–300: sidebar/panel bg + hover; 400–600: muted text; 700–900: text
      surfaces: {
        50: '#f0f1f5', // lightest bg (inputs, cards)
        100: '#e6e7ed', // editor bg (editor.background)
        200: '#d6d8df', // sidebar bg / hover / borders (sideBar.background)
        300: '#c8cad3', // slightly stronger border
        400: '#9da0ab', // line numbers / very muted (editorLineNumber.foreground)
        500: '#888b94', // comment text
        600: '#73767d', // placeholder / ghost text
        700: '#4a5069', // medium text
        800: '#363c4d', // UI foreground (editor.foreground adjusted)
        900: '#343b59', // primary text (editor.foreground)
      },
      accentColors: [
        { name: 'Red', value: '#8c4351' },
        { name: 'Orange', value: '#965027' },
        { name: 'Amber', value: '#8f5e15' },
        { name: 'Green', value: '#33635c' },
        { name: 'Teal', value: '#006c86' },
        { name: 'Cyan', value: '#0da0ba' },
        { name: 'Blue', value: '#2959aa' },
        { name: 'Deep Purple', value: '#65359d' },
        { name: 'Purple', value: '#7b43ba' },
      ],
      defaultAccent: '#2959aa',
      semanticColors: {
        info: '#0da0ba',
        warning: '#8f5e15',
        success: '#33635c',
        error: '#bd4040',
      },
      statusColors: {
        needsAction: '#707280',
        inProcess: '#2959aa',
        completed: '#33635c',
        cancelled: '#8c4351',
      },
      priorityColors: { high: '#8c4351', medium: '#8f5e15', low: '#2959aa' },
    },
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
