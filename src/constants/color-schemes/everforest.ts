import type { ColorSchemeDefinition } from '$types/color';

export const everforestColorScheme: ColorSchemeDefinition = {
  id: 'everforest',
  name: 'Everforest',
  flavors: [
    {
      id: 'dark',
      name: 'Dark',
      mode: 'dark',
      surfaces: {
        50: '#d3c6aa',
        100: '#d3c6aa',
        200: '#d3c6aa',
        300: '#9da9a0',
        400: '#859289',
        500: '#7a8478',
        600: '#56635f',
        700: '#3d484d',
        800: '#2d353b',
        900: '#232a2e',
      },
      accentColors: [
        { name: 'Red', value: '#e67e80' },
        { name: 'Orange', value: '#e69875' },
        { name: 'Yellow', value: '#dbbc7f' },
        { name: 'Green', value: '#a7c080' },
        { name: 'Aqua', value: '#83c092' },
        { name: 'Blue', value: '#7fbbb3' },
        { name: 'Purple', value: '#d699b6' },
      ],
      defaultAccent: 'Green',
      semanticColors: {
        info: '#7fbbb3',
        dueToday: '#e69875',
        warning: '#dbbc7f',
        success: '#a7c080',
        error: '#e67e80',
      },
      statusColors: {
        needsAction: '#859289',
        inProcess: '#dbbc7f',
        completed: '#a7c080',
        cancelled: '#e67e80',
      },
      priorityColors: { high: '#e67e80', medium: '#dbbc7f', low: '#7fbbb3' },
    },
  ],
};
