import type { ColorSchemeDefinition } from '$types/color';

export const catppuccinColorScheme: ColorSchemeDefinition = {
  id: 'catppuccin',
  name: 'Catppuccin',
  flavors: [
    {
      id: 'latte',
      name: 'Latte',
      mode: 'light',
      // Mapped so surface-200 is a visible border on Base, and surface-800 is readable primary text.
      // light → dark: Base → … → Text
      surfaces: {
        50: '#eff1f5', // Base (main bg / hover tint)
        100: '#e6e9ef', // Mantle
        200: '#dce0e8', // Crust         ← borders (visible on #eff1f5)
        300: '#ccd0da', // Surface 0
        400: '#acb0be', // Surface 2
        500: '#7c7f93', // Overlay 2     ← secondary text
        600: '#6c6f85', // Subtext 0
        700: '#5c5f77', // Subtext 1
        800: '#4c4f69', // Text          ← primary text
        900: '#3d3f5a', // derived darker
      },
      accentColors: [
        { name: 'Red', value: '#d20f39' },
        { name: 'Peach', value: '#fe640b' },
        { name: 'Yellow', value: '#df8e1d' },
        { name: 'Green', value: '#40a02b' },
        { name: 'Teal', value: '#179299' },
        { name: 'Sapphire', value: '#209fb5' },
        { name: 'Blue', value: '#1e66f5' },
        { name: 'Lavender', value: '#7287fd' },
        { name: 'Mauve', value: '#8839ef' },
        { name: 'Pink', value: '#ea76cb' },
      ],
      defaultAccent: '#8839ef',
      semanticColors: {
        info: '#1e66f5',
        warning: '#df8e1d',
        success: '#40a02b',
        error: '#d20f39',
      },
      statusColors: {
        needsAction: '#6c6f85',
        inProcess: '#1e66f5',
        completed: '#40a02b',
        cancelled: '#d20f39',
      },
      priorityColors: { high: '#d20f39', medium: '#df8e1d', low: '#1e66f5' },
    },
    {
      id: 'frappe',
      name: 'Frappé',
      mode: 'dark',
      // 50–200: Text (primary fg); 300–400: Subtext (secondary fg); 500–600: mid surfaces; 700: borders; 800–900: backgrounds
      surfaces: {
        50: '#c6d0f5', // Text
        100: '#c6d0f5', // Text          ← selected/highlighted text
        200: '#c6d0f5', // Text          ← primary text (dark:text-surface-200)
        300: '#b5bfe2', // Subtext 1
        400: '#a5adce', // Subtext 0     ← secondary text (dark:text-surface-400)
        500: '#737994', // Overlay 0
        600: '#51576d', // Surface 1
        700: '#414559', // Surface 0     ← borders / hover (dark:border-surface-700)
        800: '#303446', // Base          ← main bg (dark:bg-surface-800)
        900: '#292c3c', // Mantle        ← deeper bg
      },
      accentColors: [
        { name: 'Red', value: '#e78284' },
        { name: 'Peach', value: '#ef9f76' },
        { name: 'Yellow', value: '#e5c890' },
        { name: 'Green', value: '#a6d189' },
        { name: 'Teal', value: '#81c8be' },
        { name: 'Sapphire', value: '#85c1dc' },
        { name: 'Blue', value: '#8caaee' },
        { name: 'Lavender', value: '#babbf1' },
        { name: 'Mauve', value: '#ca9ee6' },
        { name: 'Pink', value: '#f4b8e4' },
      ],
      defaultAccent: '#ca9ee6',
      semanticColors: {
        info: '#8caaee',
        warning: '#e5c890',
        success: '#a6d189',
        error: '#e78284',
      },
      statusColors: {
        needsAction: '#a5adce',
        inProcess: '#8caaee',
        completed: '#a6d189',
        cancelled: '#e78284',
      },
      priorityColors: { high: '#e78284', medium: '#e5c890', low: '#8caaee' },
    },
    {
      id: 'macchiato',
      name: 'Macchiato',
      mode: 'dark',
      surfaces: {
        50: '#cad3f5', // Text
        100: '#cad3f5', // Text          ← selected/highlighted text
        200: '#cad3f5', // Text          ← primary text
        300: '#b8c0e0', // Subtext 1
        400: '#a5adcb', // Subtext 0     ← secondary text
        500: '#6e738d', // Overlay 0
        600: '#494d64', // Surface 1
        700: '#363a4f', // Surface 0     ← borders / hover
        800: '#24273a', // Base          ← main bg
        900: '#1e2030', // Mantle
      },
      accentColors: [
        { name: 'Red', value: '#ed8796' },
        { name: 'Peach', value: '#f5a97f' },
        { name: 'Yellow', value: '#eed49f' },
        { name: 'Green', value: '#a6da95' },
        { name: 'Teal', value: '#8bd5ca' },
        { name: 'Sapphire', value: '#7dc4e4' },
        { name: 'Blue', value: '#8aadf4' },
        { name: 'Lavender', value: '#b7bdf8' },
        { name: 'Mauve', value: '#c6a0f6' },
        { name: 'Pink', value: '#f5bde6' },
      ],
      defaultAccent: '#c6a0f6',
      semanticColors: {
        info: '#8aadf4',
        warning: '#eed49f',
        success: '#a6da95',
        error: '#ed8796',
      },
      statusColors: {
        needsAction: '#a5adcb',
        inProcess: '#8aadf4',
        completed: '#a6da95',
        cancelled: '#ed8796',
      },
      priorityColors: { high: '#ed8796', medium: '#eed49f', low: '#8aadf4' },
    },
    {
      id: 'mocha',
      name: 'Mocha',
      mode: 'dark',
      surfaces: {
        50: '#cdd6f4', // Text
        100: '#cdd6f4', // Text          ← selected/highlighted text
        200: '#cdd6f4', // Text          ← primary text
        300: '#bac2de', // Subtext 1
        400: '#a6adc8', // Subtext 0     ← secondary text
        500: '#6c7086', // Overlay 0
        600: '#45475a', // Surface 1
        700: '#313244', // Surface 0     ← borders / hover
        800: '#1e1e2e', // Base          ← main bg
        900: '#181825', // Mantle
      },
      accentColors: [
        { name: 'Red', value: '#f38ba8' },
        { name: 'Peach', value: '#fab387' },
        { name: 'Yellow', value: '#f9e2af' },
        { name: 'Green', value: '#a6e3a1' },
        { name: 'Teal', value: '#94e2d5' },
        { name: 'Sapphire', value: '#74c7ec' },
        { name: 'Blue', value: '#89b4fa' },
        { name: 'Lavender', value: '#b4befe' },
        { name: 'Mauve', value: '#cba6f7' },
        { name: 'Pink', value: '#f5c2e7' },
      ],
      defaultAccent: '#cba6f7',
      semanticColors: {
        info: '#89b4fa',
        warning: '#f9e2af',
        success: '#a6e3a1',
        error: '#f38ba8',
      },
      statusColors: {
        needsAction: '#a6adc8',
        inProcess: '#89b4fa',
        completed: '#a6e3a1',
        cancelled: '#f38ba8',
      },
      priorityColors: { high: '#f38ba8', medium: '#f9e2af', low: '#89b4fa' },
    },
  ],
};
