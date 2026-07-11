import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountsDefaultsSettings } from '$components/settings/AccountsDefaultsSettings';

const mockSetDefaultCalendarId = vi.fn();
const mockUseAccounts = vi.fn();

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock('$hooks/queries/useAccounts', () => ({
  useAccounts: () => mockUseAccounts(),
}));

vi.mock('$hooks/queries/useTags', () => ({
  useTags: () => ({ data: [] }),
}));

vi.mock('$hooks/ui/useColorPresets', () => ({
  useColorPresets: () => [],
}));

vi.mock('$hooks/ui/useResolvedAccentColor', () => ({
  useResolvedAccentColor: () => '#7dd3fc',
}));

vi.mock('$context/settingsContext', () => ({
  useSettingsStore: () => ({
    defaultPriority: 'none',
    setDefaultPriority: vi.fn(),
    defaultStatus: 'needs-action',
    setDefaultStatus: vi.fn(),
    defaultPercentComplete: 0,
    setDefaultPercentComplete: vi.fn(),
    defaultTags: [],
    setDefaultTags: vi.fn(),
    defaultCalendarId: null,
    setDefaultCalendarId: mockSetDefaultCalendarId,
    preferCalDAVCalendarForNewTasks: true,
    setPreferCalDAVCalendarForNewTasks: vi.fn(),
    defaultCalendarColor: 'accent',
    setDefaultCalendarColor: vi.fn(),
    defaultStartDate: 'none',
    setDefaultStartDate: vi.fn(),
    defaultDueDate: 'none',
    setDefaultDueDate: vi.fn(),
    defaultReminders: [],
    setDefaultReminders: vi.fn(),
    defaultRrule: null,
    setDefaultRrule: vi.fn(),
    defaultRepeatFrom: 'due-date',
    setDefaultRepeatFrom: vi.fn(),
    dateFormat: 'MMM d, yyyy',
    defaultTagColor: 'accent',
    setDefaultTagColor: vi.fn(),
  }),
}));

describe('AccountsDefaultsSettings', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  it('does not render empty account groups in the default calendar select', async () => {
    mockUseAccounts.mockReturnValue({
      data: [
        {
          id: 'local-account',
          name: 'Local',
          calendars: [],
          isActive: true,
          sortOrder: 100,
          caldav: null,
        },
        {
          id: 'remote-account',
          name: 'Chloe',
          calendars: [
            {
              id: 'tasks-calendar',
              accountId: 'remote-account',
              displayName: 'Tasks',
              url: 'https://example.invalid/tasks/',
              sortOrder: 100,
            },
          ],
          isActive: true,
          sortOrder: 200,
          caldav: {
            serverUrl: 'https://example.invalid/',
            username: 'chloe',
            password: 'secret',
            serverType: 'generic',
            authType: 'basic',
          },
        },
      ],
    });

    await act(async () => {
      root.render(<AccountsDefaultsSettings />);
    });

    const calendarOption = container.querySelector('option[value="tasks-calendar"]');
    const calendarSelect = calendarOption?.closest('select');
    const groups = Array.from(calendarSelect?.querySelectorAll('optgroup') ?? []).map(
      (group) => group.label,
    );
    expect(groups).toEqual(['Chloe']);
    expect(calendarOption?.textContent).toBe('Tasks');
  });
});
