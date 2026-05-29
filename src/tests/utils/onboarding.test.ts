import { describe, expect, it } from 'vitest';
import type { Account } from '$types';
import { shouldShowOnboarding } from '$utils/onboarding';
import { makeCalendar, makeTask } from '../fixtures';

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'local-account',
  name: 'Local',
  calendars: [],
  isActive: true,
  sortOrder: 100,
  caldav: null,
  ...overrides,
});

const baseInput = {
  onboardingCompleted: false,
  accountsPending: false,
  tasksPending: false,
  accounts: [],
  tasks: [],
};

describe('shouldShowOnboarding', () => {
  it('shows onboarding for an empty workspace', () => {
    expect(shouldShowOnboarding(baseInput)).toBe(true);
  });

  it('shows onboarding for a local-only workspace without tasks', () => {
    const account = makeAccount({
      calendars: [
        makeCalendar({
          displayName: 'Someday',
          url: 'local://someday',
        }),
      ],
    });

    expect(shouldShowOnboarding({ ...baseInput, accounts: [account] })).toBe(true);
  });

  it('does not show onboarding after completion or while data is pending', () => {
    expect(shouldShowOnboarding({ ...baseInput, onboardingCompleted: true })).toBe(false);
    expect(shouldShowOnboarding({ ...baseInput, accountsPending: true })).toBe(false);
    expect(shouldShowOnboarding({ ...baseInput, tasksPending: true })).toBe(false);
  });

  it('does not show onboarding when a real account exists', () => {
    const account = makeAccount({
      caldav: {
        serverUrl: 'https://cal.example.com',
        username: 'user',
        password: 'pass',
        serverType: 'generic',
        authType: 'basic',
      },
    });

    expect(shouldShowOnboarding({ ...baseInput, accounts: [account] })).toBe(false);
  });

  it('does not show after local tasks exist', () => {
    const account = makeAccount({
      calendars: [
        makeCalendar({
          displayName: 'Personal',
          url: 'local://personal',
        }),
      ],
    });

    expect(shouldShowOnboarding({ ...baseInput, accounts: [account], tasks: [makeTask()] })).toBe(
      false,
    );
  });
});
