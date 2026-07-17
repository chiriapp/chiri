import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskDefaultsSettings } from '$components/settings/TaskDefaultsSettings/TaskDefaultsSettings';

const mockSetDefaultCalendarId = vi.fn();
const mockSetDefaultStatus = vi.fn();
const mockSetDefaultPercentComplete = vi.fn();
const mockUseAccounts = vi.fn();

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const baseMockStore = {
  defaultPriority: 'none',
  setDefaultPriority: vi.fn(),
  defaultStatus: 'needs-action',
  setDefaultStatus: mockSetDefaultStatus,
  defaultPercentComplete: 0,
  setDefaultPercentComplete: mockSetDefaultPercentComplete,
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
  defaultStartTime: null,
  setDefaultStartTime: vi.fn(),
  defaultDueDate: 'none',
  setDefaultDueDate: vi.fn(),
  defaultDueTime: null,
  setDefaultDueTime: vi.fn(),
  defaultReminders: [],
  setDefaultReminders: vi.fn(),
  defaultRrule: null,
  setDefaultRrule: vi.fn(),
  defaultRepeatFrom: 0,
  setDefaultRepeatFrom: vi.fn(),
  defaultAllDayReminderHour: 17,
  setDefaultAllDayReminderHour: vi.fn(),
  allDayReminderNotificationsEnabled: true,
  setAllDayReminderNotificationsEnabled: vi.fn(),
  dateFormat: 'MMM d, yyyy',
  timeFormat: '12',
  defaultTagColor: 'accent',
  setDefaultTagColor: vi.fn(),
};

let mockStore = { ...baseMockStore };

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
  useSettingsStore: () => mockStore,
}));

describe('TaskDefaultsSettings', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAccounts.mockReturnValue({ data: [] });
    mockStore = { ...baseMockStore };
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  it('shows the progress slider only when status is in-process', async () => {
    mockStore.defaultStatus = 'in-process';
    mockStore.defaultPercentComplete = 25;

    await act(async () => {
      root.render(<TaskDefaultsSettings />);
    });

    const slider = container.querySelector('input[type="range"]');
    expect(slider).not.toBeNull();
    expect(slider?.getAttribute('value')).toBe('25');
  });

  it('hides the progress slider when status is completed', async () => {
    mockStore.defaultStatus = 'completed';
    mockStore.defaultPercentComplete = 100;

    await act(async () => {
      root.render(<TaskDefaultsSettings />);
    });

    const slider = container.querySelector('input[type="range"]');
    expect(slider).toBeNull();
    expect(container.textContent).toContain('Progress is set automatically');
    expect(container.textContent).toContain('Completed');
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
      root.render(<TaskDefaultsSettings />);
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
