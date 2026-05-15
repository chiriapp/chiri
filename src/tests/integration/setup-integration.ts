/**
 * integration-test setup. loaded by vitest before integration tests run
 *
 * the key trick: swap `$lib/tauri-http` for the Node-fetch shim so the real
 * production CalDAV functions can run without a Tauri runtime. also stub the
 * connection store (writes are a side effect we don't care about in tests)
 */
import { vi } from 'vitest';

// CHIRI_TEST_CALDAV_* vars are loaded into process.env by Node's --env-file
// flag (set via NODE_OPTIONS in the test:integration script). vite's env
// loading only populates import.meta.env, not process.env

vi.mock('$lib/tauri-http', async () => {
  const shim = await import('./fetch-shim');
  return shim;
});

vi.mock('$context/connectionContext', () => ({
  connectionStore: {
    setConnection: vi.fn(),
    getConnection: vi.fn(),
    deleteConnection: vi.fn(),
    hasConnection: vi.fn(),
  },
}));

vi.mock('$lib/store/tags', () => ({ getAllTags: () => [] }));
vi.mock('$utils/misc', () => ({
  generateUUID: () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  isVikunjaServer: (path: string) => path.includes('/dav/projects'),
  pluralize: (count: number, singular: string, plural?: string) =>
    count === 1 ? singular : (plural ?? `${singular}s`),
}));
