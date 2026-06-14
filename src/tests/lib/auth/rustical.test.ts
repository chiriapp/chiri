import { describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: vi.fn(),
}));

import { normalizeRusticalUrl } from '$lib/auth/rustical';

describe('normalizeRusticalUrl', () => {
  it('preserves explicit http and https schemes', () => {
    expect(normalizeRusticalUrl('http://localhost:3000')).toBe('http://localhost:3000');
    expect(normalizeRusticalUrl('https://rustical.example.com')).toBe(
      'https://rustical.example.com',
    );
  });

  it('trims whitespace and strips one trailing slash', () => {
    expect(normalizeRusticalUrl('  https://rustical.example.com/  ')).toBe(
      'https://rustical.example.com',
    );
  });

  it('rejects scheme-less urls', () => {
    expect(() => normalizeRusticalUrl('rustical.example.com')).toThrow(
      /must start with http:\/\/ or https:\/\//i,
    );
  });
});
