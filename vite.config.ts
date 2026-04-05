import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const namedChunks = {
  'date-fns': ['date-fns'],
  'dnd-kit': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
  frimousse: ['frimousse'],
  lucide: ['lucide-react'],
  markdown: ['marked'],
  react: ['react', 'react-dom'],
  'rrule-temporal': ['rrule-temporal'],
  sonner: ['sonner'],
  'tanstack-query': ['@tanstack/react-query', '@tanstack/query-core'],
  'tauri-core': ['@tauri-apps/cli', '@tauri-apps/api'],
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
      $components: path.resolve(__dirname, './src/components'),
      $context: path.resolve(__dirname, './src/context'),
      $constants: path.resolve(__dirname, './src/constants'),
      $hooks: path.resolve(__dirname, './src/hooks'),
      $lib: path.resolve(__dirname, './src/lib'),
      $providers: path.resolve(__dirname, './src/providers'),
      $styles: path.resolve(__dirname, './src/styles'),
      $types: path.resolve(__dirname, './src/types'),
      $utils: path.resolve(__dirname, './src/utils'),

      // Tree-shake lucide-react by resolving icons/* to individual ESM files
      'lucide-react/icons': fileURLToPath(
        new URL('./node_modules/lucide-react/dist/esm/icons', import.meta.url),
      ),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    minify: !process.env.TAURI_DEBUG,
    sourcemap: !!process.env.TAURI_DEBUG,
    rolldownOptions: {
      output: {
        chunkFileNames: (chunk) =>
          [...Object.keys(namedChunks), 'tauri-plugins'].includes(chunk.name)
            ? 'assets/[name].js'
            : 'assets/[name]-[hash].js',

        manualChunks: (id) => {
          for (const [chunkName, modules] of Object.entries(namedChunks)) {
            if (id.includes('node_modules/@tauri-apps/plugin-')) {
              return 'tauri-plugins';
            }

            if (modules.some((mod) => id.includes(`node_modules/${mod}/`))) {
              return chunkName;
            }
          }
        },
      },
    },
  },
});
