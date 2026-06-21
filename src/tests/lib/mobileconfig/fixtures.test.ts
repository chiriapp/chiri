import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const fixture = (name: string) =>
  readFileSync(fileURLToPath(new URL(`../../fixtures/mobileconfig/${name}`, import.meta.url)));

describe('mobileconfig binary fixtures', () => {
  it('keeps a canonical XML profile with synthetic credentials', () => {
    const xml = fixture('typical.xml').toString('utf8');

    expect(xml).toContain('<string>caldav.example.test</string>');
    expect(xml).toContain('<string>app-password</string>');
    expect(xml).toContain('<integer>8443</integer>');
  });

  it('includes an equivalent binary plist container', () => {
    expect(fixture('typical.binary.plist').subarray(0, 8).toString('ascii')).toBe('bplist00');
  });

  it('includes distinct CMS SignedData and EnvelopedData containers', () => {
    const signed = fixture('typical.signed.der');
    const encrypted = fixture('typical.encrypted.der');

    expect(signed[0]).toBe(0x30);
    expect(encrypted[0]).toBe(0x30);
    expect(signed.equals(encrypted)).toBe(false);
  });
});
