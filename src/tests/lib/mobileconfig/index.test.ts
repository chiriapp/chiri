import { describe, expect, it } from 'vitest';
import {
  isMobileConfigFileName,
  MOBILE_CONFIG_EXTENSION,
  MOBILE_CONFIG_MAX_BYTES,
  MOBILE_CONFIG_MIME_TYPE,
} from '$lib/mobileconfig';
import { getMobileConfigFileName } from '$lib/mobileconfig/export';

describe('mobileconfig core helpers', () => {
  it('recognizes profile filenames case-insensitively', () => {
    expect(isMobileConfigFileName('account.mobileconfig')).toBe(true);
    expect(isMobileConfigFileName('ACCOUNT.MOBILECONFIG')).toBe(true);
    expect(isMobileConfigFileName('account.mobileconfig.xml')).toBe(false);
  });

  it('provides the Apple profile extension and MIME type', () => {
    expect(MOBILE_CONFIG_EXTENSION).toBe('.mobileconfig');
    expect(MOBILE_CONFIG_MIME_TYPE).toBe('application/x-apple-aspen-config');
    expect(MOBILE_CONFIG_MAX_BYTES).toBe(5 * 1024 * 1024);
  });

  it('creates a filesystem-safe export filename', () => {
    expect(getMobileConfigFileName({ name: 'Work & Personal' })).toBe(
      'work_personal_caldav.mobileconfig',
    );
    expect(getMobileConfigFileName({ name: 'chloe (fastmail)' })).toBe(
      'chloe_fastmail_caldav.mobileconfig',
    );
    expect(getMobileConfigFileName({ name: '✨' })).toBe('caldav.mobileconfig');
  });
});
