import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from '$components/ErrorBoundary';
import {
  applyHiddenWindowDockIconState,
  forceShowWindow,
  initializeApp,
  shouldShowWindowOnStartup,
  showBootstrapError,
  showWindow,
} from '$lib/bootstrap';
import { loggers } from '$lib/logger';
import { queryClient } from '$lib/queryClient';
import { ConfirmDialogProvider } from '$providers/ConfirmDialogProvider';
import { ConnectionProvider } from '$providers/ConnectionProvider';
import { DismissableLayerProvider } from '$providers/DismissableLayerProvider';
import { ModalStateProvider } from '$providers/ModalStateProvider';
import { NotificationProvider } from '$providers/NotificationProvider';
import { SettingsProvider } from '$providers/SettingsProvider';
import { SyncProvider } from '$providers/SyncProvider';
import { ToastProvider } from '$providers/ToastProvider';

import App from '~/App';
import '$styles/index.css';

const log = loggers.main;

const renderApp = () => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SettingsProvider>
            <NotificationProvider>
              <ConnectionProvider>
                <SyncProvider>
                  <DismissableLayerProvider>
                    <ModalStateProvider>
                      <ConfirmDialogProvider>
                        <ToastProvider />
                        <App />
                      </ConfirmDialogProvider>
                    </ModalStateProvider>
                  </DismissableLayerProvider>
                </SyncProvider>
              </ConnectionProvider>
            </NotificationProvider>
          </SettingsProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
};

const bootstrap = async () => {
  await initializeApp();
  renderApp();
  if (await shouldShowWindowOnStartup()) {
    await showWindow();
  } else {
    await applyHiddenWindowDockIconState();
  }
};

await bootstrap().catch(async (error) => {
  log.error('Failed to initialize app:', error);
  showBootstrapError(error);
  // still show window so user can see the error
  forceShowWindow();
});
