import type { ReactNode } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountModal } from '$components/modals/AccountModal/AccountModal';
import type { Account, AccountDraft, ServerType } from '$types/account';

const mocks = vi.hoisted(() => {
  const draft: AccountDraft = {
    name: '',
    icon: '',
    emoji: '',
    serverUrl: '',
    username: '',
    password: '',
    serverType: 'generic',
    calendarHomeUrl: '',
    principalUrl: '',
    acceptInvalidCerts: false,
  };

  return {
    draft,
    selectServerType: vi.fn((serverType: ServerType) => {
      draft.serverType = serverType;
    }),
    cancelTestConnection: vi.fn(),
    useAccountDraft: vi.fn(() => ({
      draft,
      updateDraft: vi.fn(),
      setDraftField: vi.fn(),
      selectServerType: mocks.selectServerType,
      hasChanges: true,
    })),
    useAccountConnectionTest: vi.fn(() => ({
      isTesting: false,
      testSuccess: false,
      testConnectionId: null,
      testedCalendars: [],
      setupError: null,
      setupNotice: null,
      setSetupError: vi.fn(),
      setSetupNotice: vi.fn(),
      testingAccountIds: {},
      cancelTestConnection: mocks.cancelTestConnection,
      testConnection: vi.fn(),
      connectWithCertHandling: vi.fn(),
      validateServerUrlScheme: vi.fn(() => true),
      validatePrincipalUrl: vi.fn(() => true),
      confirmServerWarning: vi.fn(),
      confirmServerUrlWarning: vi.fn(),
    })),
    useAccountSetup: vi.fn(() => ({ isLoading: false, handleSubmit: vi.fn() })),
    confirm: vi.fn(),
  };
});

vi.mock('$context/confirmDialogContext', () => ({
  useConfirmDialog: () => ({ confirm: mocks.confirm }),
}));

vi.mock('$context/settingsContext', () => ({
  useSettingsStore: () => ({ enforceVapid: false }),
}));

vi.mock('$hooks/account/useAccountDraft', () => ({
  useAccountDraft: mocks.useAccountDraft,
}));

vi.mock('$hooks/account/useAccountConnectionTest', () => ({
  useAccountConnectionTest: mocks.useAccountConnectionTest,
}));

vi.mock('$hooks/account/useAccountSetup', () => ({
  useAccountSetup: mocks.useAccountSetup,
}));

vi.mock('$components/ModalWrapper', () => ({
  ModalWrapper: ({
    title,
    description,
    children,
    footer,
    footerLeft,
  }: {
    title: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    footerLeft?: ReactNode;
  }) => (
    <section>
      <h1>{title}</h1>
      <p>{description}</p>
      <div data-testid="body">{children}</div>
      <div data-testid="footer-left">{footerLeft}</div>
      <div data-testid="footer">{footer}</div>
    </section>
  ),
}));

vi.mock('$components/modals/AccountModal/AccountModalBody', () => ({
  AccountModalBody: ({
    step,
    onSelectServerType,
    onSelectBrowserLogin,
    onSelectCredentials,
  }: {
    step: string;
    onSelectServerType: (serverType: ServerType) => void;
    onSelectBrowserLogin: () => void;
    onSelectCredentials: () => void;
  }) => (
    <div data-testid="account-step" data-step={step}>
      {step === 'pick-type' && (
        <button type="button" onClick={() => onSelectServerType('fastmail')}>
          Choose Fastmail
        </button>
      )}
      {step === 'connect-method' && (
        <>
          <button type="button" onClick={onSelectBrowserLogin}>
            Browser login
          </button>
          <button type="button" onClick={onSelectCredentials}>
            Credentials
          </button>
        </>
      )}
    </div>
  ),
}));

describe('AccountModal workflow', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    mocks.draft.serverType = 'generic';
    mocks.cancelTestConnection.mockReset();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('starts on the server picker without rendering footer actions', () => {
    act(() => {
      root.render(<AccountModal account={null} onClose={vi.fn()} />);
    });

    expect(container.querySelector('[data-testid="account-step"]')?.getAttribute('data-step')).toBe(
      'pick-type',
    );
    expect(container.querySelector('[data-testid="footer"]')?.textContent).toBe('');
    expect(container.querySelector('[data-testid="footer-left"]')?.textContent).toBe('');
  });

  it('opens a Fastmail account directly in browser reauthorization mode', () => {
    const account: Account = {
      id: 'fastmail-account',
      name: 'Fastmail',
      calendars: [],
      isActive: true,
      sortOrder: 100,
      caldav: {
        serverUrl: 'https://caldav.fastmail.com',
        username: 'user@example.com',
        password: '',
        serverType: 'fastmail',
        authType: 'oauth',
      },
    };
    mocks.draft.serverType = 'fastmail';

    act(() => {
      root.render(<AccountModal account={account} reauthorize onClose={vi.fn()} />);
    });

    expect(container.querySelector('h1')?.textContent).toBe('Reconnect Fastmail');
    expect(container.querySelector('[data-testid="account-step"]')?.getAttribute('data-step')).toBe(
      'fastmail-oauth',
    );
  });

  it('moves from server type selection to connect method selection', () => {
    act(() => {
      root.render(<AccountModal account={null} onClose={vi.fn()} />);
    });

    act(() => {
      container.querySelector('button')?.click();
    });

    expect(mocks.selectServerType).toHaveBeenCalledWith('fastmail');
    expect(container.querySelector('[data-testid="account-step"]')?.getAttribute('data-step')).toBe(
      'connect-method',
    );
  });

  it('routes connect method choices to the matching next step', () => {
    act(() => {
      root.render(<AccountModal account={null} onClose={vi.fn()} />);
    });
    act(() => container.querySelector('button')?.click());

    const buttons = Array.from(container.querySelectorAll('button'));
    act(() => buttons.find((button) => button.textContent === 'Credentials')?.click());
    expect(container.querySelector('[data-testid="account-step"]')?.getAttribute('data-step')).toBe(
      'credentials',
    );
  });
});
