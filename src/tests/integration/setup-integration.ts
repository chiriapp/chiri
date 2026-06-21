/**
 * integration-test setup. loaded by vitest before integration tests run
 *
 * the key trick: swap `$lib/tauriHttp` for the fetch shim so the real
 * production CalDAV functions can run without a Tauri runtime. also stub the
 * connection store (writes are a side effect we don't care about in tests)
 */
import { loadEnv } from 'vite';
import { vi } from 'vitest';

// Vite loads .env files into import.meta.env, but these tests read process.env
// preserve shell-provided values and fill missing CHIRI_TEST_* vars from .env.local
const integrationEnv = loadEnv(import.meta.env.MODE, process.cwd(), 'CHIRI_TEST_');
for (const [key, value] of Object.entries(integrationEnv)) {
  process.env[key] ??= value;
}

vi.mock('$lib/tauriHttp', async () => {
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
