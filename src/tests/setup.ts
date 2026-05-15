import { vi } from 'vitest';
import 'vitest-canvas-mock';

// globally stub the Tauri logging plugin so any module that transitively imports
// `$lib/logger` evaluates cleanly under Node
// real logging only happens inside the Tauri webview anyway
vi.mock('@tauri-apps/plugin-log', () => ({
  attachConsole: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('$lib/logger', () => ({
  loggers: new Proxy(
    {},
    {
      get: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    },
  ),
}));
