import { describe, expect, it } from 'vitest';
import { getServerWarning, getUrlWarning, isVikunjaServer } from '$lib/caldav/warnings';

describe('isVikunjaServer', () => {
  it('returns true when path contains /dav/projects', () => {
    expect(isVikunjaServer('https://vikunja.io/dav/projects/user/')).toBe(true);
    expect(isVikunjaServer('/dav/projects/123')).toBe(true);
  });

  it('returns false for typical CalDAV server paths', () => {
    expect(isVikunjaServer('https://example.com/remote.php/dav/calendars/alice/')).toBe(false);
    expect(isVikunjaServer('/dav.php/principals/alice/')).toBe(false);
    expect(isVikunjaServer('/caldav/principal/alice/')).toBe(false);
    expect(isVikunjaServer('')).toBe(false);
  });
});

describe('CalDAV warnings', () => {
  it('warns for Vikunja by server type or calendar home path', () => {
    expect(getServerWarning('vikunja')?.title).toBe('Vikunja server warning');
    expect(getServerWarning('generic', { calendarHome: '/dav/projects/123' })?.title).toBe(
      'Vikunja server warning',
    );
  });

  it('warns for unsupported provider URLs before connecting', () => {
    expect(
      getUrlWarning('https://apidata.googleusercontent.com/caldav/v2/alice/events')?.title,
    ).toBe('Google CalDAV warning');
    expect(getUrlWarning('https://caldav.icloud.com')?.title).toBe('iCloud CalDAV warning');
    expect(getUrlWarning('https://p158-caldav.icloud.com')?.title).toBe('iCloud CalDAV warning');
    expect(getUrlWarning('https://cloud.example.com')).toBeNull();
  });

  it('does not warn for supported providers', () => {
    expect(getServerWarning('fastmail')).toBeNull();
    expect(
      getServerWarning('generic', {
        calendarHome: '/remote.php/dav/calendars/alice/',
      }),
    ).toBeNull();
  });
});
