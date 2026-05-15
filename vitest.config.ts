import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./src/tests/setup.ts'],
    // Split into two projects so tests run in the lightest environment they need.
    // `environmentMatchGlobs` was deprecated in vitest 3+; `projects` is the
    // forward path (see vitest.dev/guide/projects).
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/tests/**/*.test.ts'],
          exclude: [
            'src/tests/lib/tauri-http.test.ts',
            'src/tests/utils/mobileconfig.test.ts',
            'src/tests/utils/color.test.ts',
            'src/tests/integration/**',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: [
            'src/tests/lib/tauri-http.test.ts',
            'src/tests/utils/mobileconfig.test.ts',
            'src/tests/utils/color.test.ts',
          ],
        },
      },
      // integration project: runs against a real CalDAV server when
      // CHIRI_TEST_CALDAV_* env vars are set. excluded from the default
      // `pnpm test` run via `--project` filtering in the script
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['src/tests/integration/**/*.test.ts'],
          setupFiles: ['./src/tests/setup.ts', './src/tests/integration/setup-integration.ts'],
        },
      },
    ],
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './src'),
      $components: resolve(__dirname, './src/components'),
      $context: resolve(__dirname, './src/context'),
      $constants: resolve(__dirname, './src/constants'),
      $hooks: resolve(__dirname, './src/hooks'),
      $lib: resolve(__dirname, './src/lib'),
      $providers: resolve(__dirname, './src/providers'),
      $styles: resolve(__dirname, './src/styles'),
      $types: resolve(__dirname, './src/types'),
      $utils: resolve(__dirname, './src/utils'),
    },
  },
});
