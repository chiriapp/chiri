import { describe, expect, it } from 'vitest';
import type { KeyboardShortcut } from '$types';
import { getShortcutSignature, keyboardShortcutsMatch, shortcutsConflict } from '$utils/keyboard';

const shortcut = (overrides: Partial<KeyboardShortcut>): KeyboardShortcut => ({
  id: 'test-shortcut',
  key: 'n',
  description: 'Test shortcut',
  ...overrides,
});

describe('getShortcutSignature', () => {
  it('normalizes single-character keys case-insensitively', () => {
    expect(getShortcutSignature(shortcut({ key: 'N', meta: true }))).toBe(
      getShortcutSignature(shortcut({ key: 'n', meta: true })),
    );
  });

  it('keeps named keys distinct', () => {
    expect(getShortcutSignature(shortcut({ key: 'ArrowUp' }))).not.toBe(
      getShortcutSignature(shortcut({ key: 'ArrowDown' })),
    );
  });

  it('includes modifiers in the signature', () => {
    expect(getShortcutSignature(shortcut({ key: 'n', meta: true }))).not.toBe(
      getShortcutSignature(shortcut({ key: 'n', shift: true })),
    );
  });

  it('returns null for removed shortcuts', () => {
    expect(getShortcutSignature(shortcut({ key: undefined }))).toBe(null);
  });
});

describe('shortcutsConflict', () => {
  it('detects duplicate shortcut combinations', () => {
    expect(
      shortcutsConflict(shortcut({ key: 'f', meta: true }), shortcut({ key: 'F', meta: true })),
    ).toBe(true);
  });

  it('allows the same key with different modifiers', () => {
    expect(
      shortcutsConflict(shortcut({ key: 'f', meta: true }), shortcut({ key: 'f', alt: true })),
    ).toBe(false);
  });

  it('ignores removed shortcuts when checking conflicts', () => {
    expect(shortcutsConflict(shortcut({ key: undefined }), shortcut({ key: 'f' }))).toBe(false);
  });
});

describe('keyboardShortcutsMatch', () => {
  const defaults = [
    shortcut({ id: 'new-task', key: 'n', meta: true }),
    shortcut({ id: 'search', key: 'f', meta: true }),
  ];

  it('matches shortcuts with the same ids and combinations', () => {
    expect(
      keyboardShortcutsMatch(
        [
          shortcut({ id: 'search', key: 'F', meta: true }),
          shortcut({ id: 'new-task', key: 'n', meta: true }),
        ],
        defaults,
      ),
    ).toBe(true);
  });

  it('detects changed shortcut combinations', () => {
    expect(
      keyboardShortcutsMatch(
        [
          shortcut({ id: 'new-task', key: 'x', meta: true }),
          shortcut({ id: 'search', key: 'f', meta: true }),
        ],
        defaults,
      ),
    ).toBe(false);
  });

  it('detects missing shortcuts', () => {
    expect(
      keyboardShortcutsMatch([shortcut({ id: 'new-task', key: 'n', meta: true })], defaults),
    ).toBe(false);
  });
});
