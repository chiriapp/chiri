import { describe, expect, it } from 'vitest';
import type { KeyboardShortcut } from '$types';
import {
  getReservedShortcutMessage,
  getShortcutSignature,
  isReservedShortcut,
  keyboardShortcutsMatch,
  normalizeShortcutKey,
  shortcutsConflict,
} from '$utils/keyboard';

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

  it('normalizes non-breaking spaces as Space', () => {
    expect(normalizeShortcutKey('\u00A0')).toBe(' ');
    expect(getShortcutSignature(shortcut({ key: '\u00A0', meta: true, alt: true }))).toBe(
      getShortcutSignature(shortcut({ key: ' ', meta: true, alt: true })),
    );
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

describe('isReservedShortcut', () => {
  it('blocks exact macOS native app and window shortcuts', () => {
    const reservedShortcuts = [
      shortcut({ key: 'q', meta: true }),
      shortcut({ key: 'w', meta: true }),
      shortcut({ key: 'w', meta: true, alt: true }),
      shortcut({ key: 'h', meta: true }),
      shortcut({ key: 'h', meta: true, alt: true }),
      shortcut({ key: 'm', meta: true }),
      shortcut({ key: 'm', meta: true, alt: true }),
      shortcut({ key: 'f', meta: true, ctrl: true }),
    ];

    for (const reservedShortcut of reservedShortcuts) {
      expect(isReservedShortcut(reservedShortcut, 'macos')).toBe(true);
      expect(getReservedShortcutMessage(reservedShortcut, 'macos')).toBe(
        'Reserved by the app menu.',
      );
    }
  });

  it('blocks exact macOS system navigation, session, and screenshot shortcuts', () => {
    const reservedShortcuts = [
      shortcut({ key: 'Tab', meta: true }),
      shortcut({ key: '`', meta: true }),
      shortcut({ key: '`', meta: true, shift: true }),
      shortcut({ key: ' ', meta: true }),
      shortcut({ key: ' ', meta: true, alt: true }),
      shortcut({ key: ' ', meta: true, ctrl: true }),
      shortcut({ key: 'Escape', meta: true, alt: true }),
      shortcut({ key: 'q', meta: true, ctrl: true }),
      shortcut({ key: 'q', meta: true, shift: true }),
      shortcut({ key: 'q', meta: true, shift: true, alt: true }),
      shortcut({ key: '3', meta: true, shift: true }),
      shortcut({ key: '4', meta: true, shift: true }),
      shortcut({ key: '5', meta: true, shift: true }),
    ];

    for (const reservedShortcut of reservedShortcuts) {
      expect(isReservedShortcut(reservedShortcut, 'macos')).toBe(true);
      expect(getReservedShortcutMessage(reservedShortcut, 'macos')).toBe('Reserved by macOS.');
    }

    expect(isReservedShortcut(shortcut({ key: '\u00A0', meta: true, alt: true }), 'macos')).toBe(
      true,
    );
    expect(
      getReservedShortcutMessage(shortcut({ key: '\u00A0', meta: true, alt: true }), 'macos'),
    ).toBe('Reserved by macOS.');
  });

  it('allows normal app shortcuts on macOS', () => {
    const appShortcuts = [
      shortcut({ key: 'n', meta: true }),
      shortcut({ key: 'f', meta: true }),
      shortcut({ key: 'r', meta: true }),
      shortcut({ key: ',', meta: true }),
      shortcut({ key: '/', meta: true }),
    ];

    for (const appShortcut of appShortcuts) {
      expect(isReservedShortcut(appShortcut, 'macos')).toBe(false);
    }

    expect(getReservedShortcutMessage(shortcut({ key: 'n', meta: true }), 'macos')).toBe(null);
  });

  it('does not apply macOS reservations to other platforms', () => {
    expect(isReservedShortcut(shortcut({ key: 'q', meta: true }), 'other')).toBe(false);
  });

  it('blocks exact Windows system shortcuts', () => {
    const reservedShortcuts = [
      shortcut({ key: 'F4', alt: true }),
      shortcut({ key: 'F4', meta: true }),
      shortcut({ key: ' ', alt: true }),
      shortcut({ key: 'Tab', alt: true }),
      shortcut({ key: 'Tab', alt: true, shift: true }),
      shortcut({ key: 'Tab', meta: true, alt: true }),
      shortcut({ key: 'Escape', alt: true }),
      shortcut({ key: 'Escape', meta: true }),
      shortcut({ key: 'Delete', meta: true, alt: true }),
      shortcut({ key: 'Escape', meta: true, shift: true }),
      shortcut({ key: 'PrintScreen' }),
      shortcut({ key: 'PrintScreen', alt: true }),
      shortcut({ key: 'F12' }),
    ];

    for (const reservedShortcut of reservedShortcuts) {
      expect(isReservedShortcut(reservedShortcut, 'windows')).toBe(true);
      expect(getReservedShortcutMessage(reservedShortcut, 'windows')).toBe('Reserved by Windows.');
    }
  });

  it('blocks Windows-key shortcuts on Windows', () => {
    const reservedShortcut = shortcut({ key: 'n', super: true });

    expect(isReservedShortcut(reservedShortcut, 'windows')).toBe(true);
    expect(getReservedShortcutMessage(reservedShortcut, 'windows')).toBe('Reserved by Windows.');
    expect(isReservedShortcut(reservedShortcut, 'macos')).toBe(false);
  });

  it('allows normal app shortcuts on Windows', () => {
    const appShortcuts = [
      shortcut({ key: 'n', meta: true }),
      shortcut({ key: 'f', meta: true }),
      shortcut({ key: 'r', meta: true }),
      shortcut({ key: ',', meta: true }),
      shortcut({ key: '/', meta: true }),
    ];

    for (const appShortcut of appShortcuts) {
      expect(isReservedShortcut(appShortcut, 'windows')).toBe(false);
      expect(getReservedShortcutMessage(appShortcut, 'windows')).toBe(null);
    }
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
