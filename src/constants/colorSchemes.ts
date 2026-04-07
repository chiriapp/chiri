export type ColorSchemeMode = 'light' | 'dark';

export interface ColorSchemeSurfaces {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface ColorSchemeAccent {
  name: string;
  value: string;
}

export interface ColorSchemeFlavor {
  id: string;
  name: string;
  mode: ColorSchemeMode;
  surfaces: ColorSchemeSurfaces;
  accentColors: ColorSchemeAccent[];
  defaultAccent: string;
}

export interface ColorSchemeDefinition {
  id: string;
  name: string;
  /** empty = no flavor concept (Default scheme) */
  flavors: ColorSchemeFlavor[];
}

export const COLOR_SCHEMES: ColorSchemeDefinition[] = [
  {
    id: 'default',
    name: 'Default',
    flavors: [],
  },
  {
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
          50: '#eff1f5',  // Base (main bg / hover tint)
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
          { name: 'Lavender', value: '#7287fd' },
          { name: 'Blue', value: '#1e66f5' },
          { name: 'Sapphire', value: '#209fb5' },
          { name: 'Teal', value: '#179299' },
          { name: 'Green', value: '#40a02b' },
          { name: 'Yellow', value: '#df8e1d' },
          { name: 'Peach', value: '#fe640b' },
          { name: 'Red', value: '#d20f39' },
          { name: 'Mauve', value: '#8839ef' },
          { name: 'Pink', value: '#ea76cb' },
        ],
        defaultAccent: '#8839ef',
      },
      {
        id: 'frappe',
        name: 'Frappé',
        mode: 'dark',
        // light → dark: Text → … → Mantle (Base as surface-800, elevated panel as surface-700)
        surfaces: {
          50: '#c6d0f5',  // Text          ← surface-50 rarely used in dark mode
          100: '#b5bfe2', // Subtext 1
          200: '#a5adce', // Subtext 0     ← primary text (dark:text-surface-200)
          300: '#838ba7', // Overlay 1
          400: '#737994', // Overlay 0     ← secondary text (dark:text-surface-400)
          500: '#626880', // Surface 2
          600: '#51576d', // Surface 1
          700: '#414559', // Surface 0     ← borders / hover (dark:border-surface-700)
          800: '#303446', // Base          ← main bg (dark:bg-surface-800)
          900: '#292c3c', // Mantle        ← deeper bg
        },
        accentColors: [
          { name: 'Lavender', value: '#babbf1' },
          { name: 'Blue', value: '#8caaee' },
          { name: 'Sapphire', value: '#85c1dc' },
          { name: 'Teal', value: '#81c8be' },
          { name: 'Green', value: '#a6d189' },
          { name: 'Yellow', value: '#e5c890' },
          { name: 'Peach', value: '#ef9f76' },
          { name: 'Red', value: '#e78284' },
          { name: 'Mauve', value: '#ca9ee6' },
          { name: 'Pink', value: '#f4b8e4' },
        ],
        defaultAccent: '#ca9ee6',
      },
      {
        id: 'macchiato',
        name: 'Macchiato',
        mode: 'dark',
        surfaces: {
          50: '#cad3f5',  // Text
          100: '#b8c0e0', // Subtext 1
          200: '#a5adcb', // Subtext 0     ← primary text
          300: '#8087a2', // Overlay 1
          400: '#6e738d', // Overlay 0     ← secondary text
          500: '#5b6078', // Surface 2
          600: '#494d64', // Surface 1
          700: '#363a4f', // Surface 0     ← borders / hover
          800: '#24273a', // Base          ← main bg
          900: '#1e2030', // Mantle
        },
        accentColors: [
          { name: 'Lavender', value: '#b7bdf8' },
          { name: 'Blue', value: '#8aadf4' },
          { name: 'Sapphire', value: '#7dc4e4' },
          { name: 'Teal', value: '#8bd5ca' },
          { name: 'Green', value: '#a6da95' },
          { name: 'Yellow', value: '#eed49f' },
          { name: 'Peach', value: '#f5a97f' },
          { name: 'Red', value: '#ed8796' },
          { name: 'Mauve', value: '#c6a0f6' },
          { name: 'Pink', value: '#f5bde6' },
        ],
        defaultAccent: '#c6a0f6',
      },
      {
        id: 'mocha',
        name: 'Mocha',
        mode: 'dark',
        surfaces: {
          50: '#cdd6f4',  // Text
          100: '#bac2de', // Subtext 1
          200: '#a6adc8', // Subtext 0     ← primary text
          300: '#7f849c', // Overlay 1
          400: '#6c7086', // Overlay 0     ← secondary text
          500: '#585b70', // Surface 2
          600: '#45475a', // Surface 1
          700: '#313244', // Surface 0     ← borders / hover
          800: '#1e1e2e', // Base          ← main bg
          900: '#181825', // Mantle
        },
        accentColors: [
          { name: 'Lavender', value: '#b4befe' },
          { name: 'Blue', value: '#89b4fa' },
          { name: 'Sapphire', value: '#74c7ec' },
          { name: 'Teal', value: '#94e2d5' },
          { name: 'Green', value: '#a6e3a1' },
          { name: 'Yellow', value: '#f9e2af' },
          { name: 'Peach', value: '#fab387' },
          { name: 'Red', value: '#f38ba8' },
          { name: 'Mauve', value: '#cba6f7' },
          { name: 'Pink', value: '#f5c2e7' },
        ],
        defaultAccent: '#cba6f7',
      },
    ],
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    flavors: [
      {
        id: 'dark',
        name: 'Dark',
        mode: 'dark',
        // light → dark: light1 (fg) → dark0_hard (deepest bg)
        surfaces: {
          50: '#fbf1c7',  // light0 (brightest fg)
          100: '#ebdbb2', // light1
          200: '#d5c4a1', // light2        ← primary text
          300: '#bdae93', // light3
          400: '#a89984', // light4        ← secondary text
          500: '#7c6f64', // dark4
          600: '#665c54', // dark3
          700: '#3c3836', // dark1         ← borders / hover
          800: '#282828', // dark0         ← main bg
          900: '#1d2021', // dark0_hard
        },
        accentColors: [
          { name: 'Yellow', value: '#fabd2f' },
          { name: 'Orange', value: '#fe8019' },
          { name: 'Red', value: '#fb4934' },
          { name: 'Green', value: '#b8bb26' },
          { name: 'Aqua', value: '#8ec07c' },
          { name: 'Blue', value: '#83a598' },
          { name: 'Purple', value: '#d3869b' },
        ],
        defaultAccent: '#fabd2f',
      },
      {
        id: 'light',
        name: 'Light',
        mode: 'light',
        // light → dark: light0_hard (bg) → dark0 (darkest text)
        surfaces: {
          50: '#f9f5d7',  // light0_hard   ← hover tint
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
          { name: 'Yellow', value: '#d79921' },
          { name: 'Orange', value: '#d65d0e' },
          { name: 'Red', value: '#cc241d' },
          { name: 'Green', value: '#98971a' },
          { name: 'Aqua', value: '#689d6a' },
          { name: 'Blue', value: '#458588' },
          { name: 'Purple', value: '#b16286' },
        ],
        defaultAccent: '#d79921',
      },
    ],
  },
  {
    id: 'nord',
    name: 'Nord',
    flavors: [
      {
        id: 'dark',
        name: 'Dark',
        mode: 'dark',
        // light → dark: nord6 (Snow Storm) → nord0 (Polar Night)
        // surface-300/400 interpolated across the gap between Snow Storm and Polar Night
        surfaces: {
          50: '#eceff4',  // nord6 — Snow Storm 3 (brightest fg)
          100: '#e5e9f0', // nord5 — Snow Storm 2
          200: '#d8dee9', // nord4 — Snow Storm 1     ← primary text
          300: '#aab1bf', // interpolated ~33%
          400: '#7a8394', // interpolated ~67%         ← secondary text
          500: '#4c566a', // nord3 — Polar Night 4
          600: '#434c5e', // nord2 — Polar Night 3
          700: '#3b4252', // nord1 — Polar Night 2     ← borders / hover
          800: '#2e3440', // nord0 — Polar Night 1     ← main bg
          900: '#252b35', // derived darker
        },
        accentColors: [
          { name: 'Frost Blue', value: '#88c0d0' },
          { name: 'Frost Teal', value: '#8fbcbb' },
          { name: 'Frost Indigo', value: '#81a1c1' },
          { name: 'Frost Dark Blue', value: '#5e81ac' },
          { name: 'Aurora Green', value: '#a3be8c' },
          { name: 'Aurora Yellow', value: '#ebcb8b' },
          { name: 'Aurora Orange', value: '#d08770' },
          { name: 'Aurora Red', value: '#bf616a' },
          { name: 'Aurora Purple', value: '#b48ead' },
        ],
        defaultAccent: '#88c0d0',
      },
    ],
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    flavors: [
      {
        id: 'night',
        name: 'Night',
        mode: 'dark',
        // light → dark: fg → bg_dark
        surfaces: {
          50: '#c0caf5',  // fg
          100: '#a9b1d6', // fg_dark        ← bright text
          200: '#a9b1d6', // fg_dark        ← primary text (dark:text-surface-200)
          300: '#8e96bc', // interpolated
          400: '#737aa2', // dark5          ← secondary text
          500: '#545c7e', // dark3
          600: '#414868', // terminal_black
          700: '#292e42', // bg_highlight   ← borders / hover
          800: '#1a1b26', // bg             ← main bg
          900: '#16161e', // bg_dark
        },
        accentColors: [
          { name: 'Blue', value: '#7aa2f7' },
          { name: 'Magenta', value: '#bb9af7' },
          { name: 'Purple', value: '#9d7cd8' },
          { name: 'Teal', value: '#73daca' },
          { name: 'Cyan', value: '#7dcfff' },
          { name: 'Green', value: '#9ece6a' },
          { name: 'Yellow', value: '#e0af68' },
          { name: 'Orange', value: '#ff9e64' },
          { name: 'Red', value: '#f7768e' },
        ],
        defaultAccent: '#7aa2f7',
      },
    ],
  },
];

export const DEFAULT_COLOR_SCHEME_ID = 'default';
