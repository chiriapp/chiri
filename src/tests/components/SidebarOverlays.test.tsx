import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SidebarContextMenuOverlayProps } from '$components/sidebar/SidebarContextMenuOverlay';
import type { SidebarModalOverlaysProps } from '$components/sidebar/SidebarModalOverlays';
import { SidebarOverlays } from '$components/sidebar/SidebarOverlays';
import type { Account } from '$types/account';

// react-dom test renders need act() to batch/flushing behavior; flag checked by React at runtime
const globalWithActEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
globalWithActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('$components/sidebar/SidebarContextMenu', () => ({
  SidebarContextMenu: ({ contextMenu }: { contextMenu: { type: string } }) => (
    <output data-overlay="context-menu" data-type={contextMenu.type} />
  ),
}));

vi.mock('$components/modals/AccountModal/AccountModal', () => ({
  AccountModal: ({ account }: { account: Account | null }) => (
    <output data-overlay="account-modal" data-account-id={account?.id ?? 'new'} />
  ),
}));
vi.mock('$components/modals/CalendarModal', () => ({
  CalendarModal: () => <output data-overlay="calendar-modal" />,
}));
vi.mock('$components/modals/ExportModal', () => ({
  ExportModal: () => <output data-overlay="export-modal" />,
}));
vi.mock('$components/modals/FilterModal', () => ({
  FilterModal: () => <output data-overlay="filter-modal" />,
}));
vi.mock('$components/modals/FilterPresetModal', () => ({
  FilterPresetModal: () => <output data-overlay="filter-preset-modal" />,
}));
vi.mock('$components/modals/SidebarMobileConfigExportModal', () => ({
  SidebarMobileConfigExportModal: ({ accountId }: { accountId: string | null }) =>
    accountId ? <output data-overlay="mobile-config-modal" /> : null,
}));
vi.mock('$components/modals/TagModal', () => ({
  TagModal: () => <output data-overlay="tag-modal" />,
}));

const account: Account = {
  id: 'account-1',
  name: 'Account 1',
  calendars: [],
  isActive: true,
  sortOrder: 0,
  caldav: null,
};

const noop = vi.fn();
const contextMenuOverlay: SidebarContextMenuOverlayProps = {
  contextMenu: null,
  accounts: [account],
  syncingCalendarId: null,
  testingAccountIds: {},
  onCloseContextMenu: noop,
  onPointerCloseContextMenu: noop,
  syncCalendar: vi.fn(),
  onEditAccount: noop,
  onTestConnection: noop,
  onEditCalendar: noop,
  onEditTag: noop,
  onCreateCalendar: noop,
  onExportCalendar: noop,
  onExportAccount: noop,
  onMobileConfigExport: noop,
  onDeleteAccount: vi.fn(),
  onDeleteCalendar: vi.fn(),
  onDeleteTag: vi.fn(),
  onEditFilter: noop,
  onDeleteFilter: vi.fn(),
  onExpandAll: noop,
  onCollapseAll: noop,
};

const modalOverlays: SidebarModalOverlaysProps = {
  accounts: [account],
  tasks: [],
  modals: {
    showAccountModal: true,
    editingAccountId: 'account-1',
    showTagModal: false,
    editingTagId: null,
    showCreateCalendar: false,
    createCalendarAccountId: null,
    showCalendarModal: false,
    editingCalendar: null,
    showFilterPresetModal: false,
    editingFilterId: null,
    exportTarget: null,
    mobileConfigAccountId: 'account-1',
    openAccount: noop,
    closeAccount: noop,
    openTag: noop,
    closeTag: noop,
    openCreateCalendar: noop,
    closeCreateCalendar: noop,
    openCalendar: noop,
    closeCalendar: noop,
    openFilterPreset: noop,
    closeFilterPreset: noop,
    openFilter: noop,
    closeFilter: noop,
    openExportCalendar: noop,
    openExportAccount: noop,
    closeExport: noop,
    openMobileConfigExport: noop,
    closeMobileConfigExport: noop,
  },
  existingFilterPresetIds: new Set(),
  onCreateFilterPreset: noop,
  onConfirmMobileConfigExport: noop,
};

describe('SidebarOverlays', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('keeps context-menu rendering independent from modal rendering', async () => {
    await act(async () => {
      root.render(
        <SidebarOverlays contextMenuOverlay={contextMenuOverlay} modalOverlays={modalOverlays} />,
      );
    });

    expect(container.querySelector('[data-overlay="context-menu"]')).toBeNull();
    expect(
      container.querySelector('[data-overlay="account-modal"]')?.getAttribute('data-account-id'),
    ).toBe('account-1');
    expect(container.querySelector('[data-overlay="mobile-config-modal"]')).not.toBeNull();

    await act(async () => {
      root.render(
        <SidebarOverlays
          contextMenuOverlay={{
            ...contextMenuOverlay,
            contextMenu: { type: 'account', id: 'account-1', x: 10, y: 20 },
          }}
          modalOverlays={modalOverlays}
        />,
      );
    });

    expect(
      container.querySelector('[data-overlay="context-menu"]')?.getAttribute('data-type'),
    ).toBe('account');
  });

  it('renders no modal overlays when their owning state is closed', async () => {
    await act(async () => {
      root.render(
        <SidebarOverlays
          contextMenuOverlay={{
            ...contextMenuOverlay,
            contextMenu: { type: 'calendar', id: 'calendar-1', x: 10, y: 20 },
          }}
          modalOverlays={{
            ...modalOverlays,
            modals: {
              ...modalOverlays.modals,
              showAccountModal: false,
              editingAccountId: null,
              mobileConfigAccountId: null,
            },
          }}
        />,
      );
    });

    expect(container.querySelector('[data-overlay="context-menu"]')).not.toBeNull();
    expect(container.querySelector('[data-overlay="account-modal"]')).toBeNull();
    expect(container.querySelector('[data-overlay="mobile-config-modal"]')).toBeNull();
  });
});
