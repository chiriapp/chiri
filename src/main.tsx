import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, StrictMode } from 'react';
import ReactDOM, { type Root } from 'react-dom/client';
import { BootstrapErrorScreen } from '$components/BootstrapErrorScreen';
import { ErrorBoundary } from '$components/ErrorBoundary';
import {
  applyHiddenWindowDockIconState,
  deleteDatabase,
  forceShowWindow,
  initializeApp,
  shouldShowWindowOnStartup,
  showWindow,
} from '$lib/bootstrap';
import { loggers } from '$lib/logger';
import { queryClient } from '$lib/queryClient';
import { watchWindowState } from '$lib/windowState';
import { ConfirmDialogProvider } from '$providers/ConfirmDialogProvider';
import { ConnectionProvider } from '$providers/ConnectionProvider';
import { DismissableLayerProvider } from '$providers/DismissableLayerProvider';
import { ModalStateProvider } from '$providers/ModalStateProvider';
import { NotificationProvider } from '$providers/NotificationProvider';
import { SettingsProvider } from '$providers/SettingsProvider';
import { SyncProvider } from '$providers/SyncProvider';
import { TaskHighlightProvider } from '$providers/TaskHighlightProvider';
import { TaskSelectionProvider } from '$providers/TaskSelectionProvider';
import { ToastProvider } from '$providers/ToastProvider';

import App from '~/App';
import '$styles/index.css';

const log = loggers.main;

let root: Root | null = null;

const renderRoot = (children: ReactNode) => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  root ??= ReactDOM.createRoot(rootElement);
  root.render(<StrictMode>{children}</StrictMode>);
};

const renderApp = () => {
  renderRoot(
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <NotificationProvider>
            <ConnectionProvider>
              <SyncProvider>
                <DismissableLayerProvider>
                  <ModalStateProvider>
                    <ConfirmDialogProvider>
                      <TaskSelectionProvider>
                        <TaskHighlightProvider>
                          <ToastProvider />
                          <App />
                        </TaskHighlightProvider>
                      </TaskSelectionProvider>
                    </ConfirmDialogProvider>
                  </ModalStateProvider>
                </DismissableLayerProvider>
              </SyncProvider>
            </ConnectionProvider>
          </NotificationProvider>
        </SettingsProvider>
      </QueryClientProvider>
    </ErrorBoundary>,
  );
};

const renderBootstrapError = (error: unknown) => {
  renderRoot(<BootstrapErrorScreen error={error} onResetDatabase={deleteDatabase} />);
};

const bootstrap = async () => {
  await initializeApp();
  renderApp();
  await watchWindowState().catch((error) => {
    log.warn('Failed to watch window state:', error);
  });
  if (await shouldShowWindowOnStartup()) {
    await showWindow();
  } else {
    await applyHiddenWindowDockIconState();
  }
};

await bootstrap().catch(async (error) => {
  log.error('Failed to initialize app:', error);
  renderBootstrapError(error);
  // still show window so user can see the error
  await forceShowWindow().catch((windowError) => {
    log.error('Failed to show bootstrap error window:', windowError);
  });
});
