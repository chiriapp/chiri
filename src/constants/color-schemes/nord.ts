import type { ColorSchemeDefinition } from '$types/color';

export const nordColorScheme: ColorSchemeDefinition = {
  id: 'nord',
  name: 'Nord',
  flavors: [
    {
      id: 'dark',
      name: 'Dark',
      mode: 'dark',
      surfaces: {
        50: '#eceff4',
        100: '#eceff4',
        200: '#eceff4',
        300: '#e5e9f0',
        400: '#d8dee9',
        500: '#4c566a',
        600: '#434c5e',
        700: '#3b4252',
        800: '#2e3440',
        900: '#252b35',
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
        dueToday: '#d08770',
        warning: '#ebcb8b',
        success: '#a3be8c',
        error: '#bf616a',
      },
      statusColors: {
        needsAction: '#d8dee9',
        inProcess: '#ebcb8b',
        completed: '#a3be8c',
        cancelled: '#bf616a',
      },
      priorityColors: { high: '#bf616a', medium: '#ebcb8b', low: '#5e81ac' },
    },
  ],
};
