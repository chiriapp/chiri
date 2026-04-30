import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
  },
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
    },
  },
});
