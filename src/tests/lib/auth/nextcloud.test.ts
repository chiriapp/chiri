import { describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: vi.fn(),
}));

import { normalizeNextcloudUrl } from '$lib/auth/nextcloud';

describe('normalizeNextcloudUrl', () => {
  it('preserves explicit http and https schemes', () => {
    expect(normalizeNextcloudUrl('http://localhost:8080')).toBe('http://localhost:8080');
    expect(normalizeNextcloudUrl('https://cloud.example.com')).toBe('https://cloud.example.com');
  });

  it('trims whitespace and strips one trailing slash', () => {
    expect(normalizeNextcloudUrl('  https://cloud.example.com/  ')).toBe(
      'https://cloud.example.com',
    );
  });

  it('rejects scheme-less urls', () => {
    expect(() => normalizeNextcloudUrl('cloud.example.com')).toThrow(
      /must start with http:\/\/ or https:\/\//i,
    );
  });
});
