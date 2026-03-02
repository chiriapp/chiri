import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { SettingsProvider } from '@/context/settingsContext';
import { forceShowWindow, initializeApp, showBootstrapError, showWindow } from '@/lib/bootstrap';
import { createLogger } from '@/lib/logger';
import { queryClient } from '@/lib/queryClient';
import { ConfirmDialogProvider } from '@/providers/ConfirmDialogProvider';
import { ModalStateProvider } from '@/providers/ModalStateProvider';

const log = createLogger('Main', '#a855f7');

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <ModalStateProvider>
            <ConfirmDialogProvider>
              <App />
            </ConfirmDialogProvider>
          </ModalStateProvider>
        </SettingsProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

async function bootstrap(): Promise<void> {
  await initializeApp();
  renderApp();
  await showWindow();
}

await bootstrap().catch((error) => {
  log.error('Failed to initialize app:', error);
  showBootstrapError(error);
  // still show window so user can see the error
  forceShowWindow();
});
